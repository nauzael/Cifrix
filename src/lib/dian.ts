import { db, Invoice, Organization } from './db';
import forge from 'node-forge';

export type DianEnvironment = 'habilitacion' | 'produccion';

export interface DianResponse {
  success: boolean;
  message: string;
  cufe?: string;
  qr?: string;
  xmlUrl?: string;
  errors?: string[];
}

export class DianService {
  private static getBaseUrl(env: DianEnvironment) {
    return env === 'produccion' 
      ? 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc' 
      : 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc';
  }

  static async isConfigured(organization: Organization): Promise<boolean> {
    const settings = organization.settings?.dian;
    if (!settings) return false;
    
    return !!(
      settings.softwareId && 
      settings.pin && 
      settings.resolutionNumber &&
      settings.certificate // We check if certificate is present (base64)
    );
  }

  static async generateCUFE(invoice: Invoice, policyKey: string, organization: Organization): Promise<string> {
    // CUFE generation algorithm:
    // NumFactura + FecFactura + ValFac + CodImp1 + ValImp1 + ... + NitOfe + NitAdq + ClaveTecnica + TipoAmbiente
    
    const settings = organization.settings?.dian;
    if (!settings) throw new Error("Configuración DIAN faltante");

    // Format values for CUFE
    const numFactura = invoice.number;
    const fecFactura = invoice.date; // YYYY-MM-DD
    const valFac = invoice.subtotal.toFixed(2);
    const codImp1 = "01"; // IVA
    const valImp1 = invoice.tax.toFixed(2);
    const valImp2 = "0.00"; // Consumo (example)
    const valImp3 = "0.00"; // ICA (example)
    const valPag = invoice.total.toFixed(2);
    const nitOfe = organization.tax_id;
    const nitAdq = "222222222222"; // Consumidor final default or customer ID
    const claveTecnica = policyKey; 
    const tipoAmbiente = settings.environment === 'produccion' ? '1' : '2';

    // String concatenation as per DIAN spec
    const cufeString = `${numFactura}${fecFactura}${valFac}${codImp1}${valImp1}${valImp2}${valImp3}${valPag}${nitOfe}${nitAdq}${claveTecnica}${tipoAmbiente}`;
    
    // SHA-384 hash
    const md = forge.md.sha384.create();
    md.update(cufeString);
    return md.digest().toHex();
  }

  static async generateInvoiceXML(invoice: Invoice, organization: Organization): Promise<string> {
    // Logic to build UBL 2.1 XML structure
    // This is a placeholder. Real implementation requires a robust XML builder.
    return `<?xml version="1.0" encoding="UTF-8"?><Invoice>Mock XML for ${invoice.number}</Invoice>`;
  }

  static async signXML(xml: string, certificateBase64: string, password: string): Promise<string> {
    try {
      // Decode base64 p12
      const p12Der = forge.util.decode64(certificateBase64);
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      
      // Decrypt P12 with password
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      
      // Get key bags
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const bag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
      
      if (!bag || !bag.key) {
        throw new Error("No se encontró la llave privada en el certificado");
      }

      const privateKey = bag.key;
      
      // Get certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag]?.[0];
      
      if (!certBag || !certBag.cert) {
         throw new Error("No se encontró el certificado público");
      }

      const cert = certBag.cert;
      
      // console.log("Certificado cargado exitosamente:", cert.subject.getField('CN')?.value);

      // CRITICAL WARNING: This is a MOCK implementation of XML signing.
      // Real XAdES-BES signing requires strict canonicalization and digest generation.
      // DO NOT USE IN PRODUCTION without implementing full XAdES standard.
      
      return xml.replace('Mock XML', `Signed XML with ${cert.subject.getField('CN')?.value}`);
    } catch (error) {
      console.error("Error al firmar XML:", error);
      throw new Error(`Error con el certificado digital: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async sendInvoice(invoiceId: string): Promise<DianResponse> {
    try {
      const invoice = await db.invoices.get(invoiceId);
      if (!invoice) throw new Error('Factura no encontrada');

      const organization = await db.organizations.get(invoice.organization_id);
      if (!organization) throw new Error('Organización no encontrada');

      const configured = await this.isConfigured(organization);
      if (!configured) throw new Error('La facturación electrónica no está configurada');

      // 1. Update status to 'sending'
      await db.invoices.update(invoiceId, { dian_status: 'enviando' });

      // 2. Generate CUFE (needed for XML)
      const technicalKey = organization.settings.dian.technicalKey || 'default_tech_key';
      const cufe = await this.generateCUFE(invoice, technicalKey, organization);

      // 3. Generate XML (should include CUFE)
      const xml = await this.generateInvoiceXML(invoice, organization);

      // 4. Sign XML
      const cert = organization.settings.dian.certificate;
      const pass = organization.settings.dian.certificatePassword; // Ensure this field exists in settings form
      
      if (!cert || !pass) {
          throw new Error("Certificado o contraseña no configurados");
      }

      const signedXml = await this.signXML(xml, cert, pass);

      // 5. Send to DIAN (Mocking the SOAP request)
      const isHabilitacion = organization.settings.dian.environment === 'habilitacion';
      const testSetId = organization.settings.dian.testSetId;

      if (isHabilitacion && !testSetId) {
        throw new Error("Para enviar en Habilitación se requiere el Test Set ID");
      }

      // console.log(`Enviando a DIAN (${isHabilitacion ? 'Habilitación' : 'Producción'})`);
      // if (isHabilitacion) console.log(`Test Set ID: ${testSetId}`);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate Success
      await db.invoices.update(invoiceId, { 
          dian_status: 'aceptada', 
          cufe: cufe,
          dian_response: { message: 'Procesado exitosamente' }
      });
      
      return {
        success: true,
        message: 'Factura aceptada por la DIAN',
        cufe: cufe,
        qr: 'data:image/png;base64,mock-qr-code',
        xmlUrl: 'mock-url'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db.invoices.update(invoiceId, { dian_status: 'error', dian_response: { error: errorMessage } });
      return { success: false, message: errorMessage };
    }
  }
}
