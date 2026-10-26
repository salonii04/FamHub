// Stand-in for OpenFamily's real mailer.ts, which wires up nodemailer with
// templated HTML emails in 6 languages. Replace this when you build the
// cross-cutting notifications/email step; the signatures below match exactly,
// so routes/auth.ts does not need to change later.

export const isMailEnabled = (): boolean => false;

export const sendPasswordResetEmail = async (_args: {
    email: string;
    name: string | null;
    language: string | null;
    resetUrl: string;
}): Promise<void> => {
    // No-op until SMTP is configured.
};