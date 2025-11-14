import e from "express";
import { z } from "zod";

const customerSchema = z.object({
  cedula: z.string().min(1, "Se requiere cedula o rif"),
  nombre: z.string().min(1, "Se requiere nombre del cliente"),
  cantidad: z
    .string()
    .regex(/^\d{1,7}(\.\d{1,3})?$/, "Debe ser decimal"),
  customer_promo: z.number().int("Debe ser entero").nonnegative("No puede ser negativo")
});
export default customerSchema;