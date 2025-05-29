// src/lib/env-checker.ts

/**
 * Utility to check if required environment variables are set
 * This helps provide clear feedback during development
 */
export function checkRequiredEnvVars() {
    const requiredVars = [
      { name: 'GOOGLE_GENAI_API_KEY', description: 'API key for Google Gemini AI' },
    ];
    
    const missing: string[] = [];
    
    requiredVars.forEach(({ name, description }) => {
      if (!process.env[name]) {
        missing.push(`${name} - ${description}`);
      }
    });
    
    if (missing.length > 0) {
      console.error('\n=== ENVIRONMENT CONFIGURATION ERROR ===');
      console.error('Missing required environment variables:');
      missing.forEach(item => console.error(` - ${item}`));
      console.error('\nPlease add these to your .env.local file:');
      console.error('\n```');
      missing.forEach(item => {
        const varName = item.split(' - ')[0];
        console.error(`${varName}=your_value_here`);
      });
      console.error('```\n');
      
      // In development, throw an error for clarity
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`Missing required environment variables: ${missing.map(m => m.split(' - ')[0]).join(', ')}`);
      }
    } else {
      console.log('✅ All required environment variables are set');
    }
    
    return { missing };
  }
  
  /**
   * Check if a specific environment variable is set
   * @param name Environment variable name
   * @returns boolean indicating if the variable is set
   */
  export function isEnvVarSet(name: string): boolean {
    return !!process.env[name];
  }
  
  // Run the check when this file is imported
  if (typeof window === 'undefined') { // Only run on server
    try {
      checkRequiredEnvVars();
    } catch (error) {
      // Log the error but don't crash the app
      console.error('Environment check failed:', (error as Error).message);
    }
  }