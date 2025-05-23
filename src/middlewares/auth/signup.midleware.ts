import { NextFunction, Request, Response } from "express";

export class SignupMiddleware {
  public static validateRequired(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { name, email, password, username } = req.body;
    const errors: string[] = []; //cria um array para armazenar os erros e exibir todos juntos no final

    if (!name) {
      errors.push("Name is required"); //joga o erro no array
    }
    if (!email) {
      errors.push("Email is required");
    }
    if (!password) {
      errors.push("Password is required");
    }
    if (!username) {
      errors.push("Username is required");
    }
    //valida todos os campos obrigatórios, se cair em algum erro exibe na resposta
    if (errors.length > 0) {
      res.status(400).json({
        ok: false,
        message: errors,
      });
      return;
    }
    next();
  }
}
