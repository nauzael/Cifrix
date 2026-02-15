import forge from 'node-forge';

/**
 * Módulo de Criptografía para Autenticación Offline
 * 
 * Implementa encriptación AES-256-CBC con PBKDF2 para proteger
 * credenciales y perfiles de usuario en la bóveda local.
 */

// Configuración de seguridad
const PBKDF2_ITERATIONS = 10000;  // Balance entre seguridad y performance
const KEY_SIZE = 32;               // 256 bits para AES-256
const IV_SIZE = 16;                // 128 bits para AES-CBC
const SALT_SIZE = 32;              // 256 bits de salt

/**
 * Genera un salt aleatorio criptográficamente seguro
 */
export function generateSalt(): string {
    const saltBytes = forge.random.getBytesSync(SALT_SIZE);
    return forge.util.encode64(saltBytes);
}

/**
 * Genera un hash de la contraseña usando SHA-256 + salt
 * 
 * @param password - Contraseña en texto plano
 * @param salt - Salt en base64
 * @returns Hash en formato hexadecimal
 */
export function hashPassword(password: string, salt: string): string {
    const saltBytes = forge.util.decode64(salt);
    const md = forge.md.sha256.create();
    md.update(password + saltBytes);
    return md.digest().toHex();
}

/**
 * Verifica si una contraseña coincide con un hash almacenado
 * 
 * @param password - Contraseña a verificar
 * @param salt - Salt usado en el hash original
 * @param storedHash - Hash almacenado para comparar
 * @returns true si la contraseña es correcta
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
    const computedHash = hashPassword(password, salt);
    return computedHash === storedHash;
}

/**
 * Deriva una llave de encriptación desde una contraseña usando PBKDF2
 * 
 * @param password - Contraseña del usuario
 * @param salt - Salt en base64
 * @returns Llave de encriptación (32 bytes)
 */
function deriveEncryptionKey(password: string, salt: string): string {
    const saltBytes = forge.util.decode64(salt);
    return forge.pkcs5.pbkdf2(
        password,
        saltBytes,
        PBKDF2_ITERATIONS,
        KEY_SIZE
    );
}

/**
 * Encripta un objeto (perfil de usuario) usando AES-256-CBC
 * 
 * @param data - Objeto a encriptar (será serializado a JSON)
 * @param password - Contraseña del usuario
 * @param salt - Salt en base64
 * @returns Objeto con datos encriptados e IV
 */
export function encryptProfile(
    data: any,
    password: string,
    salt: string
): { encryptedData: string; iv: string } {
    try {
        // 1. Serializar el objeto a JSON
        const jsonString = JSON.stringify(data);

        // 2. Derivar la llave de encriptación
        const key = deriveEncryptionKey(password, salt);

        // 3. Generar IV aleatorio
        const ivBytes = forge.random.getBytesSync(IV_SIZE);

        // 4. Crear cipher AES-256-CBC
        const cipher = forge.cipher.createCipher('AES-CBC', key);
        cipher.start({ iv: ivBytes });
        cipher.update(forge.util.createBuffer(jsonString, 'utf8'));
        cipher.finish();

        // 5. Retornar datos encriptados e IV en base64
        return {
            encryptedData: forge.util.encode64(cipher.output.getBytes()),
            iv: forge.util.encode64(ivBytes)
        };
    } catch (error) {
        console.error('Error encriptando perfil:', error);
        throw new Error('Fallo en la encriptación del perfil');
    }
}

/**
 * Desencripta un perfil de usuario usando AES-256-CBC
 * 
 * @param encryptedData - Datos encriptados en base64
 * @param password - Contraseña del usuario
 * @param salt - Salt en base64
 * @param iv - Vector de inicialización en base64
 * @returns Objeto desencriptado
 * @throws Error si la desencriptación falla (contraseña incorrecta)
 */
export function decryptProfile<T = any>(
    encryptedData: string,
    password: string,
    salt: string,
    iv: string
): T {
    try {
        // 1. Derivar la llave de encriptación
        const key = deriveEncryptionKey(password, salt);

        // 2. Decodificar IV y datos encriptados
        const ivBytes = forge.util.decode64(iv);
        const encryptedBytes = forge.util.decode64(encryptedData);

        // 3. Crear decipher AES-256-CBC
        const decipher = forge.cipher.createDecipher('AES-CBC', key);
        decipher.start({ iv: ivBytes });
        decipher.update(forge.util.createBuffer(encryptedBytes));

        const success = decipher.finish();

        if (!success) {
            throw new Error('Desencriptación fallida - Contraseña incorrecta');
        }

        // 4. Convertir bytes a string y parsear JSON
        const decryptedString = decipher.output.data;
        return JSON.parse(decryptedString) as T;
    } catch (error) {
        console.error('Error desencriptando perfil:', error);
        throw new Error('Fallo en la desencriptación - Contraseña incorrecta o datos corruptos');
    }
}

/**
 * Genera un hash rápido de un string (para comparaciones)
 * Útil para detectar cambios en el perfil sin desencriptar
 */
export function quickHash(data: string): string {
    const md = forge.md.sha256.create();
    md.update(data);
    return md.digest().toHex();
}

/**
 * Valida la fortaleza de una contraseña
 * 
 * @param password - Contraseña a validar
 * @returns Objeto con resultado de validación y mensaje
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    message: string;
    strength: 'weak' | 'medium' | 'strong';
} {
    if (password.length < 6) {
        return {
            isValid: false,
            message: 'La contraseña debe tener al menos 6 caracteres',
            strength: 'weak'
        };
    }

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    let score = 0;

    // Criterios de fortaleza
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score >= 5) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return {
        isValid: true,
        message: `Contraseña ${strength === 'strong' ? 'fuerte' : strength === 'medium' ? 'media' : 'débil'}`,
        strength
    };
}

/**
 * Utilidad para medir el tiempo de encriptación (debugging/performance)
 */
export async function benchmarkEncryption(iterations: number = 100): Promise<number> {
    const testData = {
        role: 'ADMIN',
        organizationId: 'test-org-123',
        organizationName: 'Test Organization',
        allowedModules: { accounting: true, invoicing: true }
    };

    const salt = generateSalt();
    const password = 'test-password-123';

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        const { encryptedData, iv } = encryptProfile(testData, password, salt);
        decryptProfile(encryptedData, password, salt, iv);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    console.log(`Benchmark: ${iterations} iteraciones en ${(end - start).toFixed(2)}ms`);
    console.log(`Promedio por operación: ${avgTime.toFixed(2)}ms`);

    return avgTime;
}
