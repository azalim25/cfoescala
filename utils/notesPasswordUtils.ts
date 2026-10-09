// Client-side SHA-256 hashing (with a random per-user salt) for the
// optional "Minhas Notas" password. This is not a replacement for real
// server-side auth — it's a lightweight extra lock on one section of the
// page, consistent with the rest of this app's client-side permission
// checks — but it avoids storing the password itself in the database.

async function sha256Hex(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomSaltHex(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashNotesPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = randomSaltHex();
    const hash = await sha256Hex(`${salt}:${password}`);
    return { hash, salt };
}

export async function verifyNotesPassword(password: string, salt: string, hash: string): Promise<boolean> {
    const check = await sha256Hex(`${salt}:${password}`);
    return check === hash;
}
