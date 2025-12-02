// ========================================
// AI CHAT - Validation Functions
// ========================================

/**
 * Validate medication data extracted by AI
 * @param {Object} data - Medication data to validate
 * @returns {Object} - { valid: boolean, errors: array, sanitized: object }
 */
function validateMedicationData(data) {
    const errors = [];
    const sanitized = {};

    // Name - Required, min 2 characters, trim whitespace
    if (!data.name || typeof data.name !== 'string') {
        errors.push('name: Required field missing or invalid');
    } else {
        sanitized.name = data.name.trim();
        if (sanitized.name.length < 2) {
            errors.push('name: Must be at least 2 characters');
        }
        // Capitalize first letter
        sanitized.name = sanitized.name.charAt(0).toUpperCase() + sanitized.name.slice(1).toLowerCase();
    }

    // Dosage - Required, must match pattern (number + unit)
    if (!data.dosage || typeof data.dosage !== 'string') {
        errors.push('dosage: Required field missing or invalid');
    } else {
        sanitized.dosage = data.dosage.trim();
        const dosagePattern = /^\d+(\.\d+)?\s*(mg|ml|g|mcg|iu|unit|units?)$/i;
        if (!dosagePattern.test(sanitized.dosage)) {
            errors.push('dosage: Invalid format (expected: number + unit, e.g., 500mg, 10ml)');
        }
    }

    // Form - Optional, must be from allowed list
    const allowedForms = ['tablet', 'capsule', 'syrup', 'liquid', 'injection', 'cream', 'inhaler', 'drops', 'patch', 'other'];
    if (data.form) {
        sanitized.form = data.form.trim().toLowerCase();
        if (!allowedForms.includes(sanitized.form)) {
            errors.push(`form: Invalid value '${data.form}' (allowed: ${allowedForms.join(', ')})`);
        }
    }

    // Total Quantity - Optional, must be positive integer
    if (data.total_quantity !== undefined && data.total_quantity !== null) {
        const qty = Number(data.total_quantity);
        if (isNaN(qty) || qty < 1 || !Number.isInteger(qty)) {
            errors.push('total_quantity: Must be a positive integer');
        } else {
            sanitized.total_quantity = qty;
        }
    }

    // Purpose - Optional, trim whitespace
    if (data.purpose && typeof data.purpose === 'string') {
        sanitized.purpose = data.purpose.trim();
    }

    // Prescribing Doctor - Optional, trim whitespace
    if (data.prescribing_doctor && typeof data.prescribing_doctor === 'string') {
        sanitized.prescribing_doctor = data.prescribing_doctor.trim();
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
}

/**
 * Validate schedule data extracted by AI
 * @param {Object} data - Schedule data to validate
 * @returns {Object} - { valid: boolean, errors: array, sanitized: object }
 */
function validateScheduleData(data) {
    const errors = [];
    const sanitized = {};

    // Medication ID - Required
    if (!data.medication_id) {
        errors.push('medication_id: Required field missing');
    } else {
        sanitized.medication_id = data.medication_id;
    }

    // Time - Required, must be HH:MM format
    if (!data.time || typeof data.time !== 'string') {
        errors.push('time: Required field missing or invalid');
    } else {
        const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        sanitized.time = data.time.trim();
        if (!timePattern.test(sanitized.time)) {
            errors.push('time: Invalid format (expected: HH:MM, e.g., 08:00, 14:30)');
        }
    }

    // Food Timing - REQUIRED (before_food, after_food, none)
    const allowedFoodTimings = ['before_food', 'after_food', 'none'];
    if (!data.food_timing) {
        errors.push('food_timing: Required field missing');
    } else {
        sanitized.food_timing = data.food_timing.trim().toLowerCase();
        if (!allowedFoodTimings.includes(sanitized.food_timing)) {
            errors.push(`food_timing: Invalid value '${data.food_timing}' (allowed: ${allowedFoodTimings.join(', ')})`);
        }
    }

    // Frequency - Optional, default to 'daily'
    sanitized.frequency = data.frequency ? data.frequency.trim().toLowerCase() : 'daily';

    // Start Date - Optional, must be valid date
    if (data.start_date) {
        const date = new Date(data.start_date);
        if (isNaN(date.getTime())) {
            errors.push('start_date: Invalid date format');
        } else {
            sanitized.start_date = data.start_date;
        }
    }

    // End Date - Optional, must be valid date
    if (data.end_date) {
        const date = new Date(data.end_date);
        if (isNaN(date.getTime())) {
            errors.push('end_date: Invalid date format');
        } else {
            sanitized.end_date = data.end_date;
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
}
