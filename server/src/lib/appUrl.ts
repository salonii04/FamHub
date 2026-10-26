import { Request } from 'express';

/**
 * Public base URL of this OpenFamily instance, used to build links sent OUTSIDE
 * the application (family invitations, password-reset emails).
 */
export const resolveAppBaseUrl = (req?: Request): string => {
    const strip = (u: string) => u.trim().replace(/\/+$/, '');

    const configured = process.env.APP_PUBLIC_URL?.trim();
    if (configured) {
        return strip(configured);
    }

    if (req) {
        const host = req.get('host');
        if (host) {
            return `${req.protocol}://${host}`;
        }
    }

    return '';
};