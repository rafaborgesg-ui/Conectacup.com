/**
 * useFormValidation Hook
 * Sistema unificado de validação de formulários
 * 
 * Features:
 * - Validação em tempo real
 * - Validação assíncrona (duplicatas, API)
 * - Mensagens de erro customizáveis
 * - Suporte a múltiplos campos
 * - Touch state (só mostra erro após interação)
 * 
 * @example
 * ```tsx
 * const { values, errors, touched, handleChange, handleBlur, validate, isValid } = useFormValidation({
 *   initialValues: { barcode: '', model: '' },
 *   validationRules: {
 *     barcode: {
 *       required: true,
 *       minLength: 8,
 *       maxLength: 8,
 *       pattern: /^\d{8}$/,
 *       asyncValidation: async (value) => {
 *         const exists = await checkBarcodeExists(value);
 *         if (exists) return 'Código de barras já cadastrado';
 *       }
 *     },
 *     model: {
 *       required: true,
 *       custom: (value) => {
 *         if (!value) return 'Selecione um modelo';
 *       }
 *     }
 *   }
 * });
 * ```
 */

import { useState, useCallback, useEffect } from 'react';

// Tipos de validação
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: (value: any, allValues: Record<string, any>) => string | undefined;
  asyncValidation?: (value: any, allValues: Record<string, any>) => Promise<string | undefined>;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface FormValues {
  [fieldName: string]: any;
}

export interface FormErrors {
  [fieldName: string]: string | undefined;
}

export interface FormTouched {
  [fieldName: string]: boolean;
}

interface UseFormValidationProps {
  initialValues: FormValues;
  validationRules?: ValidationRules;
  onSubmit?: (values: FormValues) => void | Promise<void>;
}

// Mensagens de erro padrão
const DEFAULT_MESSAGES = {
  required: 'Este campo é obrigatório',
  minLength: (min: number) => `Mínimo de ${min} caracteres`,
  maxLength: (max: number) => `Máximo de ${max} caracteres`,
  min: (min: number) => `Valor mínimo: ${min}`,
  max: (max: number) => `Valor máximo: ${max}`,
  pattern: 'Formato inválido',
  email: 'E-mail inválido',
};

export function useFormValidation({
  initialValues,
  validationRules = {},
  onSubmit,
}: UseFormValidationProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Valida um campo individual (síncrono)
  const validateField = useCallback(
    (fieldName: string, value: any): string | undefined => {
      const rule = validationRules[fieldName];
      if (!rule) return undefined;

      // Required
      if (rule.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
        return DEFAULT_MESSAGES.required;
      }

      // Se campo vazio e não é required, não valida o resto
      if (!value || value === '') return undefined;

      // MinLength
      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        return DEFAULT_MESSAGES.minLength(rule.minLength);
      }

      // MaxLength
      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        return DEFAULT_MESSAGES.maxLength(rule.maxLength);
      }

      // Min (numérico)
      if (rule.min !== undefined && Number(value) < rule.min) {
        return DEFAULT_MESSAGES.min(rule.min);
      }

      // Max (numérico)
      if (rule.max !== undefined && Number(value) > rule.max) {
        return DEFAULT_MESSAGES.max(rule.max);
      }

      // Pattern
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        return DEFAULT_MESSAGES.pattern;
      }

      // Email
      if (rule.email && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return DEFAULT_MESSAGES.email;
        }
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value, values);
        if (customError) return customError;
      }

      return undefined;
    },
    [validationRules, values]
  );

  // Valida um campo individual (assíncrono)
  const validateFieldAsync = useCallback(
    async (fieldName: string, value: any): Promise<string | undefined> => {
      const rule = validationRules[fieldName];
      if (!rule || !rule.asyncValidation) return undefined;

      try {
        const asyncError = await rule.asyncValidation(value, values);
        return asyncError;
      } catch (error) {
        console.error(`Erro na validação assíncrona de ${fieldName}:`, error);
        return 'Erro ao validar';
      }
    },
    [validationRules, values]
  );

  // Valida todos os campos
  const validateAll = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);
    const newErrors: FormErrors = {};

    // Validação síncrona
    for (const fieldName in validationRules) {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    }

    // Validação assíncrona
    const asyncValidations = Object.keys(validationRules)
      .filter((fieldName) => validationRules[fieldName].asyncValidation)
      .map(async (fieldName) => {
        const error = await validateFieldAsync(fieldName, values[fieldName]);
        if (error) {
          newErrors[fieldName] = error;
        }
      });

    await Promise.all(asyncValidations);

    setErrors(newErrors);
    setIsValidating(false);

    return Object.keys(newErrors).length === 0;
  }, [validationRules, values, validateField, validateFieldAsync]);

  // Handle change
  const handleChange = useCallback(
    (fieldName: string, value: any) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }));

      // Valida em tempo real se o campo já foi tocado
      if (touched[fieldName]) {
        const error = validateField(fieldName, value);
        setErrors((prev) => ({ ...prev, [fieldName]: error }));
      }
    },
    [touched, validateField]
  );

  // Handle blur
  const handleBlur = useCallback(
    async (fieldName: string) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }));

      // Validação síncrona
      const syncError = validateField(fieldName, values[fieldName]);
      
      // Validação assíncrona
      const asyncError = await validateFieldAsync(fieldName, values[fieldName]);
      
      const error = syncError || asyncError;
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    },
    [values, validateField, validateFieldAsync]
  );

  // Handle submit
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      // Marca todos os campos como touched
      const allTouched: FormTouched = {};
      Object.keys(validationRules).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      // Valida tudo
      const isValid = await validateAll();

      if (isValid && onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Erro no submit:', error);
        } finally {
          setIsSubmitting(false);
        }
      }

      return isValid;
    },
    [validationRules, validateAll, onSubmit, values]
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsValidating(false);
    setIsSubmitting(false);
  }, [initialValues]);

  // Set field value (programmatic)
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  // Set field error (programmatic)
  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isValidating,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    validateAll,
    reset,
    setFieldValue,
    setFieldError,
    clearFieldError,
  };
}
