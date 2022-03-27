export function trimChar(text: string, charToRemove: string): string {
  while (text.charAt(0) == charToRemove) {
    text = text.substring(1);
  }

  while (text.charAt(text.length - 1) == charToRemove) {
    text = text.substring(0, text.length - 1);
  }

  return text;
}
