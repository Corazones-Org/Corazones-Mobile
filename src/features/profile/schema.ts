import { z } from 'zod';

export const profileFormSchema = z.object({
  name: z.string(),
  age: z
    .string()
    .refine((value) => value === '' || (Number.isInteger(Number(value)) && Number(value) > 0), {
      message: 'La edad debe ser un número entero positivo.',
    }),
  instagram: z.string(),
  partnerPreferenceId: z.number().nullable(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const profileFormDefaults: ProfileFormValues = {
  name: '',
  age: '',
  instagram: '',
  partnerPreferenceId: null,
};
