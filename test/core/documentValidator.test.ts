import { isValidCnpj, isValidCpf, isValidCpfOrCnpj, normalize, onlyDigits } from "../../src/core/documentValidator";

describe("documentValidator", () => {
  it("returns empty string for null/undefined", () => {
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits(undefined)).toBe("");
    expect(normalize(null)).toBe("");
  });

  it("validates a well-formed CPF", () => {
    expect(isValidCpfOrCnpj("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(normalize("529.982.247-25")).toBe("52998224725");
  });

  it("rejects an invalid CPF", () => {
    expect(isValidCpfOrCnpj("111.111.111-11")).toBe(false);
    expect(isValidCpfOrCnpj("123")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("529.982.247-15")).toBe(false);
  });

  it("validates a well-formed CNPJ", () => {
    expect(isValidCpfOrCnpj("04.252.011/0001-10")).toBe(true);
    expect(isValidCnpj("04.252.011/0001-10")).toBe(true);
  });

  it("rejects an invalid CNPJ", () => {
    expect(isValidCpfOrCnpj("00.000.000/0000-00")).toBe(false);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(isValidCnpj("04.252.011/0001-11")).toBe(false);
    expect(isValidCnpj("1234567890123")).toBe(false);
  });

  it("rejects documents with an invalid length", () => {
    expect(isValidCpfOrCnpj("123456789012")).toBe(false);
    expect(isValidCpfOrCnpj("12345678901234")).toBe(false);
  });
});
