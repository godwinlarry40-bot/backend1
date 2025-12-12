// src/routes/api.routes.js

import { Router } from 'express';

// Ensure the router is declared and initialized at the top
const router = Router(); 

// --- Define your API Routes ---

router.get('/', (req, res) => {
    // Example endpoint for the root of the API
    res.json({ 
        success: true, 
        message: 'Welcome to the API! Everything is running.' 
    });
});

// Example route
router.get('/status', (req, res) => {
    res.status(200).json({ 
        success: true, 
        status: 'Online', 
        version: '1.0' 
    });
});

// --- Export the router for use in the main server file ---
export default router;