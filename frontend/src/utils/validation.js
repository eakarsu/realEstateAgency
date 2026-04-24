const validators = {
  required: (value) => (!value && value !== 0) ? 'This field is required' : null,
  email: (value) => value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email address' : null,
  phone: (value) => value && !/^[\d\s\-\+\(\)]{7,20}$/.test(value) ? 'Invalid phone number' : null,
  minLength: (min) => (value) => value && value.length < min ? `Must be at least ${min} characters` : null,
  maxLength: (max) => (value) => value && value.length > max ? `Must be no more than ${max} characters` : null,
  number: (value) => value && isNaN(Number(value)) ? 'Must be a number' : null,
  min: (minVal) => (value) => value !== '' && Number(value) < minVal ? `Must be at least ${minVal}` : null,
  max: (maxVal) => (value) => value !== '' && Number(value) > maxVal ? `Must be no more than ${maxVal}` : null,
  url: (value) => value && !/^https?:\/\/.+/.test(value) ? 'Invalid URL' : null,
};

export function validate(value, rules) {
  for (const rule of rules) {
    const error = typeof rule === 'function' ? rule(value) : validators[rule]?.(value);
    if (error) return error;
  }
  return null;
}

export function validateForm(formData, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const error = validate(formData[field], rules);
    if (error) errors[field] = error;
  }
  return errors;
}

export { validators };
