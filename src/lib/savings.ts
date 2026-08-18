export type SavingsValues = {
  balance: number;
  salary: number;
  rent: number;
  fireInsurance: number;
  card: number;
  horseClub: number;
  friendClub: number;
};

export const defaultSavingsValues: SavingsValues = {
  balance: 0,
  salary: 0,
  rent: 0,
  fireInsurance: 0,
  card: 0,
  horseClub: 0,
  friendClub: 0,
};

export function calculateMonthlyNet(data: SavingsValues) {
  return data.salary - data.rent - data.fireInsurance - data.card - data.horseClub - data.friendClub;
}

export function calculateTotalSavings(data: SavingsValues) {
  return data.balance + calculateMonthlyNet(data);
}
