import { toast } from "sonner";

export const appToast = {
  success: (title: string, description?: string) =>
    toast.success(title, {
      description,
    }),

  error: (title: string, description?: string) =>
    toast.error(title, {
      description,
    }),

  info: (title: string, description?: string) =>
    toast(title, {
      description,
    }),

  warning: (title: string, description?: string) =>
    toast.warning(title, {
      description,
    }),

  loading: (title: string, description?: string) =>
    toast.loading(title, {
      description,
    }),

  dismiss: (id?: string | number) => toast.dismiss(id),
};