/**
 * ValidatedInput Component
 * Input field com validação integrada
 * 
 * Features:
 * - Mostra erro visual
 * - Ícone de status (valid/invalid)
 * - Acessível (ARIA)
 * - Suporta todos os tipos de input
 * - Loading state para validação assíncrona
 * 
 * @example
 * ```tsx
 * <ValidatedInput
 *   label="Código de Barras"
 *   value={values.barcode}
 *   error={errors.barcode}
 *   touched={touched.barcode}
 *   onChange={(e) => handleChange('barcode', e.target.value)}
 *   onBlur={() => handleBlur('barcode')}
 *   placeholder="Digite 8 dígitos"
 *   required
 * />
 * ```
 */

import React from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from './ui/utils';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  helperText?: string;
  showSuccessIcon?: boolean;
  isValidating?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

export function ValidatedInput({
  label,
  error,
  touched,
  helperText,
  showSuccessIcon = true,
  isValidating = false,
  containerClassName,
  labelClassName,
  inputClassName,
  required,
  id,
  name,
  ...inputProps
}: ValidatedInputProps) {
  const hasError = touched && error;
  const isValid = touched && !error && !isValidating && inputProps.value;
  const inputId = id || name || `input-${label?.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {/* Label */}
      {label && (
        <Label 
          htmlFor={inputId}
          className={cn(
            'text-sm',
            hasError && 'text-red-600',
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="obrigatório">*</span>}
        </Label>
      )}

      {/* Input Container */}
      <div className="relative">
        <Input
          id={inputId}
          name={name}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={
            hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          aria-required={required}
          className={cn(
            'pr-10 transition-colors',
            hasError && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            isValid && 'border-green-500 focus:ring-green-500 focus:border-green-500',
            inputClassName
          )}
          {...inputProps}
        />

        {/* Status Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isValidating && (
            <Loader2 
              className="w-4 h-4 text-gray-400 animate-spin" 
              aria-label="Validando"
            />
          )}
          
          {hasError && !isValidating && (
            <AlertCircle 
              className="w-4 h-4 text-red-500" 
              aria-hidden="true"
            />
          )}
          
          {isValid && showSuccessIcon && !isValidating && (
            <CheckCircle2 
              className="w-4 h-4 text-green-500" 
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <p 
          id={`${inputId}-error`}
          role="alert"
          className="text-sm text-red-600 flex items-start gap-1"
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {/* Helper Text */}
      {helperText && !hasError && (
        <p 
          id={`${inputId}-helper`}
          className="text-xs text-gray-600"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

// Variant for Textarea
interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  helperText?: string;
  showCharCount?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
}

export function ValidatedTextarea({
  label,
  error,
  touched,
  helperText,
  showCharCount = false,
  containerClassName,
  labelClassName,
  textareaClassName,
  required,
  id,
  name,
  maxLength,
  value,
  ...textareaProps
}: ValidatedTextareaProps) {
  const hasError = touched && error;
  const textareaId = id || name || `textarea-${label?.replace(/\s/g, '-').toLowerCase()}`;
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <Label 
            htmlFor={textareaId}
            className={cn(
              'text-sm',
              hasError && 'text-red-600',
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="obrigatório">*</span>}
          </Label>

          {/* Character Count */}
          {showCharCount && maxLength && (
            <span 
              className={cn(
                'text-xs',
                currentLength > maxLength * 0.9 ? 'text-amber-600' : 'text-gray-600',
                currentLength >= maxLength && 'text-red-600'
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* Textarea */}
      <Textarea
        id={textareaId}
        name={name}
        value={value}
        maxLength={maxLength}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={
          hasError ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
        }
        aria-required={required}
        className={cn(
          'transition-colors',
          hasError && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          textareaClassName
        )}
        {...textareaProps}
      />

      {/* Error Message */}
      {hasError && (
        <p 
          id={`${textareaId}-error`}
          role="alert"
          className="text-sm text-red-600 flex items-start gap-1"
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {/* Helper Text */}
      {helperText && !hasError && (
        <p 
          id={`${textareaId}-helper`}
          className="text-xs text-gray-600"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

// Variant for Select
interface ValidatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  helperText?: string;
  options: { value: string; label: string }[];
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
}

export function ValidatedSelect({
  label,
  error,
  touched,
  helperText,
  options,
  containerClassName,
  labelClassName,
  selectClassName,
  required,
  id,
  name,
  ...selectProps
}: ValidatedSelectProps) {
  const hasError = touched && error;
  const selectId = id || name || `select-${label?.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {/* Label */}
      {label && (
        <Label 
          htmlFor={selectId}
          className={cn(
            'text-sm',
            hasError && 'text-red-600',
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="obrigatório">*</span>}
        </Label>
      )}

      {/* Select */}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={
            hasError ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          aria-required={required}
          className={cn(
            'w-full h-10 px-3 py-2 bg-white border rounded-lg',
            'text-sm text-gray-900',
            'focus:outline-none focus:ring-2 focus:ring-[#D50000] focus:border-transparent',
            'transition-colors',
            hasError && 'border-red-500 focus:ring-red-500',
            selectClassName
          )}
          {...selectProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Error Icon */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <p 
          id={`${selectId}-error`}
          role="alert"
          className="text-sm text-red-600 flex items-start gap-1"
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {/* Helper Text */}
      {helperText && !hasError && (
        <p 
          id={`${selectId}-helper`}
          className="text-xs text-gray-600"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
