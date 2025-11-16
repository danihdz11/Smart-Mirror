import axios from "axios";

const API_URL = "http://localhost:5001/api/auth";

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

export const registerUser = async (userData: RegisterData, faceImage?: File | null) => {
  const formData = new FormData();
  formData.append("name", userData.name);
  formData.append("age", String(userData.age));
  formData.append("email", userData.email);
  formData.append("password", userData.password);
  formData.append("location", userData.location);

  if (faceImage) {
    formData.append("faceImage", faceImage);
  }

  const res = await axios.post(`${API_URL}/register`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

export const loginUser = async (credentials: LoginData) => {
  const res = await axios.post(`${API_URL}/login`, credentials);
  return res.data;
};

export const loginWithFace = async (faceImage: File) => {
  const formData = new FormData();
  formData.append("faceImage", faceImage);

  const res = await axios.post(`${API_URL}/face-login`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};