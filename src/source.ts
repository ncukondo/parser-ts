export class Source {
  constructor(private _sourceText: string, private _position: number = 0) {
  }
  text(len = 0): string {
    if (len)
      return this._sourceText.substr(this._position, len);
    return this._sourceText.substr(this._position);
  }
  move(len: number): Source {
    return new Source(this.wholeText, this._position + len);
  }
  get wholeText(): string {
    return this._sourceText;
  }
}

