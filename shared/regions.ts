export const regionOptions = [
  "North",
  "South",
  "East",
  "West",
  "Central",
  "North-East",
] as const;

export type Region = (typeof regionOptions)[number];

export const regionStates: Record<Region, string[]> = {
  North: [
    "Delhi",
    "Haryana",
    "Punjab",
    "Himachal Pradesh",
    "Jammu & Kashmir",
    "Ladakh",
    "Uttarakhand",
  ],
  South: [
    "Karnataka",
    "Kerala",
    "Tamil Nadu",
    "Andhra Pradesh",
    "Telangana",
  ],
  East: ["Bihar", "Jharkhand", "Odisha", "West Bengal"],
  West: ["Maharashtra", "Gujarat", "Goa", "Rajasthan"],
  Central: ["Madhya Pradesh", "Chhattisgarh"],
  "North-East": [
    "Assam",
    "Arunachal Pradesh",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Tripura",
    "Sikkim",
  ],
};
