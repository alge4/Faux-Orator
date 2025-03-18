interface TokenPayload {
  id: string;
  azureAdUserId: string;
  role: "DM" | "Player" | "Observer";
  email: string;
}
