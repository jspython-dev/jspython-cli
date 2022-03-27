export interface InterpreterOptions {
  file?: string;
  srcRoot: string;
  entryFunction?: string;
  version?: boolean;
  output?: string;
  params?: Record<string, unknown>;
}
