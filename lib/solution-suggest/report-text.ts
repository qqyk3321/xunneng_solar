// Helvetica's PDF standard-font WinAnsi character set. Keep form validation
// lightweight: importing the PDF library here would defeat on-demand loading.
const EXTRA_CHARACTERS = new Set(Array.from("ŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™"));
export const REPORT_TEXT_MESSAGE = "报告仅支持英文及常见拉丁字母，请使用英文填写客户姓名和地址；不支持中文、emoji 或其他无法显示的字符。";

export function normalizeReportText(value: string) {
  return value.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").trim();
}

export function isReportTextSupported(value: string) {
  return Array.from(normalizeReportText(value)).every(character => {
    const code = character.codePointAt(0)!;
    return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || EXTRA_CHARACTERS.has(character);
  });
}

export function reportCustomerTextError(customer: { name: string; address: string }) {
  return isReportTextSupported(customer.name) && isReportTextSupported(customer.address) ? "" : REPORT_TEXT_MESSAGE;
}
