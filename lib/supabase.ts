import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be defined in .env');
}

let lockQueue = Promise.resolve();

const inMemoryLock = async <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    const previous = lockQueue;
    let release!: () => void;
    lockQueue = new Promise<void>(resolve => {
        release = resolve;
    });
    await previous;
    try {
        return await fn();
    } finally {
        release();
    }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        lock: inMemoryLock
    }
});
