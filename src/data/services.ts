export interface Service {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  categoryName: string;
  categoryNameAr: string;
  price: number | string;
  packagePrice?: number | string;
  description?: string;
  descriptionAr?: string;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  sortOrder: number;
}
