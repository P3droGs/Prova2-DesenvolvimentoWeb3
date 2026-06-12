import { Request, Response, NextFunction } from 'express';

export function logger(req: Request, _res: Response, next: NextFunction): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
}

export function registrarEvento(acao: string, detalhe: string): void {
  console.log(`[evento] ${acao} :: ${detalhe}`);
}
