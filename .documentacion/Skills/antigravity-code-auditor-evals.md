# Evals: Antigravity Code Auditor Skill

## Descripción
Conjunto de casos de prueba para validar la calidad y precisión de la skill de auditor de código.

---

## EVAL 1: SQL Injection Detection (CRITICAL SECURITY)

### Input
```
Language: Python
Code:

def authenticate_user(username, password):
    """Login function with SQL vulnerability"""
    import sqlite3
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # VULNERABLE: SQL Injection
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    
    return user is not None
```

### Expected Findings
- **CRITICAL**: SQL Injection vulnerability in authenticate_user()
- Location: Line with f-string query
- Should recommend: Use parameterized queries
- Should provide: Fixed code example with `cursor.execute(query, (username, password))`

### Expectations
```json
{
  "must_find": ["SQL Injection", "CRITICAL"],
  "must_provide": ["parameterized query", "example fix"],
  "security_score": "< 40",
  "findings_count": ">= 1"
}
```

---

## EVAL 2: Missing Input Validation (HIGH SECURITY)

### Input
```
Language: JavaScript
Code:

function processUserInput(email, age) {
  // No validation
  const user = {
    email: email,
    age: parseInt(age),
    premium: age > 18
  };
  
  database.save(user);
  sendEmail(email, "Welcome!");
  return user;
}
```

### Expected Findings
- **HIGH**: Missing email validation
- **HIGH**: Missing age range validation
- **MEDIUM**: Email format not validated before sending

### Expectations
```json
{
  "must_find": ["validation", "input"],
  "severity_high_count": ">= 2",
  "should_mention": ["email format", "age range"]
}
```

---

## EVAL 3: Performance Issues (MEDIUM/HIGH)

### Input
```
Language: Java
Code:

public List<User> getAllUsersWithOrders() {
    List<User> users = new ArrayList<>();
    
    // N+1 Query Problem
    for (User user : userRepository.findAll()) {
        List<Order> orders = orderRepository.findByUserId(user.getId());
        user.setOrders(orders);
        users.add(user);
    }
    
    return users;
}

public void processLargeFile(String filePath) {
    String content = Files.readAllBytes(filePath);  // Load entire file into memory
    String[] lines = content.split("\n");
    for (String line : lines) {
        processLine(line);
    }
}
```

### Expected Findings
- **HIGH**: N+1 query problem
- **HIGH**: Loading entire file into memory
- Recommendations for pagination and streaming

### Expectations
```json
{
  "must_find": ["N+1", "memory"],
  "performance_issues": ">= 2",
  "severity_high_count": ">= 2"
}
```

---

## EVAL 4: Code Standards & Documentation (MEDIUM/LOW)

### Input
```
Language: Python
Code:

def calc(x, y, op):
    if op == 1:
        return x + y
    elif op == 2:
        return x - y
    elif op == 3:
        return x * y
    elif op == 4:
        if y == 0:
            return None
        return x / y

class DataProcessor:
    def __init__(self):
        self.data = []
        self.results = []
        self.temp = {}
    
    def process(self, d):
        for item in d:
            x = int(item)
            self.temp[x] = x * 2
        return self.temp
```

### Expected Findings
- **MEDIUM**: Poor naming (calc, op, x, y, d)
- **MEDIUM**: Missing docstrings
- **MEDIUM**: No type hints
- **LOW**: Magic numbers without explanation
- Recommendation: Better variable names, documentation

### Expectations
```json
{
  "standards_issues": ">= 3",
  "should_mention": ["naming", "documentation", "type hints"],
  "severity_medium_or_low": true
}
```

---

## EVAL 5: Cryptography Issues (HIGH SECURITY)

### Input
```
Language: Python
Code:

import hashlib

def store_password(password):
    # WEAK: MD5 is broken
    hashed = hashlib.md5(password.encode()).hexdigest()
    return hashed

def encrypt_data(data, key):
    # WEAK: Hardcoded key
    CIPHER_KEY = "my_secret_key_123"
    # Pseudo-code - in reality, no IV with ECB mode
    encrypted = encrypt_ecb_mode(data, CIPHER_KEY)
    return encrypted
```

### Expected Findings
- **CRITICAL**: MD5 for password hashing
- **CRITICAL**: Hardcoded cryptographic key
- **HIGH**: ECB mode (no IV)
- Should recommend: bcrypt/argon2, key management, CBC/GCM mode

### Expectations
```json
{
  "critical_count": ">= 2",
  "must_find": ["MD5", "hardcoded", "key"],
  "should_recommend": ["bcrypt", "argon2", "key management"]
}
```

---

## EVAL 6: Multi-file Analysis (Comprehensive)

### Input
```
Language: TypeScript
Files:
  - auth.ts
  - user.service.ts
  - api.routes.ts
```

#### auth.ts
```typescript
export function validateToken(token: string): boolean {
  // No expiration check
  return !!token;
}

export function getUserFromToken(token: string) {
  // Decoding without verification
  const decoded = atob(token);
  return JSON.parse(decoded);
}
```

#### user.service.ts
```typescript
export class UserService {
  constructor(private db: any) {}
  
  async getUser(id: string) {
    return this.db.query(`SELECT * FROM users WHERE id = ${id}`);
  }
  
  async updateUser(id: string, data: any) {
    Object.keys(data).forEach(key => {
      this.db.update(`UPDATE users SET ${key} = ${data[key]} WHERE id = ${id}`);
    });
  }
}
```

#### api.routes.ts
```typescript
app.get('/user/:id', (req, res) => {
  const user = userService.getUser(req.params.id);
  res.json(user);
});

app.post('/admin/delete/:id', (req, res) => {
  // No authentication check!
  userService.deleteUser(req.params.id);
  res.json({ success: true });
});
```

### Expected Findings
- **CRITICAL**: SQL Injection in multiple places
- **CRITICAL**: No token verification
- **CRITICAL**: No authentication on admin endpoint
- **HIGH**: No token expiration
- **HIGH**: Insecure token encoding (base64 without verification)
- **MEDIUM**: No input validation
- **MEDIUM**: No authorization checks

### Expectations
```json
{
  "files_analyzed": 3,
  "critical_count": ">= 3",
  "high_count": ">= 2",
  "cross_file_issues": true,
  "should_flag": ["SQL injection", "authentication", "authorization", "token validation"]
}
```

---

## EVAL 7: Clean Code (Positive Case)

### Input
```
Language: Python
Code:

def calculate_discount(price: float, customer_type: str) -> float:
    """
    Calculate discount based on customer type.
    
    Args:
        price: Original price in USD
        customer_type: 'regular', 'premium', or 'vip'
    
    Returns:
        Discounted price
    
    Raises:
        ValueError: If customer_type is invalid
    """
    DISCOUNT_RATES = {
        'regular': 0.0,
        'premium': 0.1,
        'vip': 0.2
    }
    
    if customer_type not in DISCOUNT_RATES:
        raise ValueError(f"Invalid customer type: {customer_type}")
    
    if price < 0:
        raise ValueError("Price cannot be negative")
    
    discount_rate = DISCOUNT_RATES[customer_type]
    return price * (1 - discount_rate)
```

### Expected Findings
- Few or no critical issues
- Good: Type hints, docstring, input validation
- Possible minor suggestions: Could use Enum, constant naming

### Expectations
```json
{
  "critical_count": 0,
  "high_count": 0,
  "overall_score": "> 85",
  "should_praise": ["type hints", "documentation", "validation"]
}
```

---

## EVAL 8: Memory and Resource Management (HIGH/MEDIUM)

### Input
```
Language: Java
Code:

public class FileProcessor {
    public void processAndCache(String filePath) {
        // Memory leak: global cache that never clears
        Map<String, String> cache = new HashMap<>();
        
        try (BufferedReader reader = new BufferedReader(new FileReader(filePath))) {
            String line;
            while ((line = reader.readLine()) != null) {
                cache.put(line, processLine(line));  // Cache grows unbounded
            }
        } catch (IOException e) {
            e.printStackTrace();  // Swallows exception
        }
        // Cache stored in static field - memory leak!
    }
    
    public void loadLargeDataset(String path) {
        // Loads entire dataset without pagination
        List<Record> records = new ArrayList<>();
        for (int i = 0; i < 1000000; i++) {
            records.add(fetchRecord(i));
        }
        processAll(records);  // High memory usage
    }
}
```

### Expected Findings
- **HIGH**: Unbounded cache growth
- **HIGH**: No pagination for large datasets
- **MEDIUM**: Swallowed exception
- Recommendations: LRU cache, streaming processing, proper exception handling

### Expectations
```json
{
  "performance_issues": ">= 2",
  "memory_issues": ">= 1",
  "should_mention": ["cache", "pagination", "streaming"]
}
```

---

## EVAL 9: Race Conditions & Concurrency (HIGH SECURITY)

### Input
```
Language: Java
Code:

public class BankAccount {
    private double balance = 0;
    
    // NOT thread-safe
    public void deposit(double amount) {
        double current = balance;
        balance = current + amount;
    }
    
    public void withdraw(double amount) {
        if (balance >= amount) {
            balance = balance - amount;
        }
    }
    
    public double getBalance() {
        return balance;
    }
}
```

### Expected Findings
- **CRITICAL**: Race condition in deposit()
- **HIGH**: Race condition in withdraw()
- Should recommend: synchronized methods or Lock
- Impact: Money could be lost or created

### Expectations
```json
{
  "critical_count": ">= 1",
  "should_mention": ["race condition", "thread-safe", "synchronized", "concurrent"]
}
```

---

## Ejecución de los Evals

Use el skill-creator con este formato:

```bash
# Create evaluations JSON
{
  "evals": [
    {
      "id": "eval-1",
      "name": "SQL Injection Detection",
      "description": "Detect critical SQL injection vulnerability",
      "code": "[code from EVAL 1]",
      "language": "python",
      "expectations": {
        "must_find_severity": "CRITICAL",
        "must_mention": ["SQL Injection", "parameterized"],
        "min_findings": 1
      }
    },
    // ... más evals
  ]
}
```

---

## Métricas de Éxito

La skill debe:
1. ✅ Identificar todos los hallazgos CRITICAL
2. ✅ Proporcionar ejemplos de código corregido
3. ✅ Explicar el "por qué" de cada hallazgo
4. ✅ Generar reportes bien estructurados
5. ✅ Ser consistente entre diferentes lenguajes
6. ✅ Adaptar severidad al contexto
7. ✅ Proporcionar referencias (OWASP, CWE)
