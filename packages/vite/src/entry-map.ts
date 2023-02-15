export default class EntryMap {
  private entries = new Map<string, string>();

  register(entry: string): string {
    const result = this.entries.get(entry);
    if (result) {
      return result;
    }
    const id = `${this.entries.size}`;
    this.entries.set(entry, id);
    return id;
  }

  stringify() {
    return JSON.stringify(Object.fromEntries(this.entries));
  }

  parse(content: string) {
    const result = JSON.parse(content) as Record<string, string>;

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(result)) {
      this.entries.set(key, value);
    }
  }
}
