/**
 * Porta em TypeScript de `DocumentValidator.java` (oficina-mvp-java, shared/validation) — mesma normalização e
 * mesmo algoritmo de dígito verificador (mod 11) para CPF (11 dígitos) e CNPJ (14 dígitos), para que os dois lados
 * concordem sobre o que é um documento válido.
 */

export function onlyDigits(value: string | null | undefined): string {
  return value ? value.replace(/\D/g, "") : "";
}

export function normalize(value: string | null | undefined): string {
  return onlyDigits(value);
}

export function isValidCpfOrCnpj(document: string | null | undefined): boolean {
  const digits = onlyDigits(document);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

export function isValidCpf(cpf: string | null | undefined): boolean {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const first = cpfCheckDigit(digits.slice(0, 9), 10);
  const second = cpfCheckDigit(digits.slice(0, 9) + first, 11);
  return first === digitAt(digits, 9) && second === digitAt(digits, 10);
}

function cpfCheckDigit(base: string, weightStart: number): number {
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    sum += digitAt(base, i) * (weightStart - i);
  }
  const check = (sum * 10) % 11;
  return check === 10 ? 0 : check;
}

export function isValidCnpj(cnpj: string | null | undefined): boolean {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const first = cnpjCheckDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = cnpjCheckDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === digitAt(digits, 12) && second === digitAt(digits, 13);
}

function cnpjCheckDigit(digits: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += digitAt(digits, i) * weights[i]!;
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

function digitAt(value: string, index: number): number {
  return Number(value.charAt(index));
}
