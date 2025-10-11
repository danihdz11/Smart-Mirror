import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

export interface RegisterData {
  name: string;
  age: number;
  email: string;
  password: string;
  location: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const registerUser = async (userData: RegisterData) => {
  const res = await axios.post(`${API_URL}/register`, userData);
  return res.data;
};

export const loginUser = async (credentials: LoginData) => {
  const res = await axios.post(`${API_URL}/login`, credentials);
  return res.data;
};
