export type IssueLevel = 'error' | 'warning';

export interface Issue {
  file: string;
  line?: number;
  level: IssueLevel;
  message: string;
}

export class IssueList {
  readonly items: Issue[] = [];
  readonly file: string;
  constructor(file: string) {
    this.file = file;
  }
  error(message: string, line?: number): void {
    this.items.push({ file: this.file, line, level: 'error', message });
  }
  warn(message: string, line?: number): void {
    this.items.push({ file: this.file, line, level: 'warning', message });
  }
}
