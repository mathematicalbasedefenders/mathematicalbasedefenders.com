import { User, UserInterface } from "../models/User";

type RepositoryResponse = {
  success: boolean;
  statusCode: number;
  error?: string;
  data?: object | UserInterface | Array<object | UserInterface>;
};

export default RepositoryResponse;
