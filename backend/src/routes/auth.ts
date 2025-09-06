import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Organization from '../models/Organization';

const router = express.Router();
const JWT_SECRET = process.env['JWT_SECRET'] || "your-secret-key";

// Sign in
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { address, email, password } = req.body;

    // Support both wallet-based and email-based signin
    let organization;
    
    if (address) {
      // Wallet-based signin
      if (!address) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      organization = await Organization.findOne({ 
        address: address.toLowerCase() 
      }).lean();
      
      if (!organization) {
        return res.status(401).json({ error: "Organization not found with this wallet address" });
      }
    } else if (email && password) {
      // Email-based signin
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      organization = await Organization.findOne({ 
        email: email.toLowerCase() 
      }).lean();
      
      if (!organization) {
        console.log(`No organization found with email: ${email.toLowerCase()}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log(`Organization found: ${organization.name}, has password: ${!!organization.password}`);

      // Verify password using bcrypt
      if (!organization.password) {
        console.log(`Organization ${organization.name} has no password set`);
        return res.status(401).json({ error: "This account doesn't have a password set. Please use wallet authentication instead." });
      }
      
      console.log(`Verifying password for organization: ${organization.name}`);
      const isValidPassword = await bcrypt.compare(password, organization.password);
      
      if (!isValidPassword) {
        console.log(`Password verification failed for organization: ${organization.name}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log(`Password verification successful for organization: ${organization.name}`);
    } else {
      return res.status(400).json({ error: "Either wallet address or email/password is required" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        organizationId: organization._id,
        address: organization.address,
        email: organization.email,
        name: organization.name
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ 
      success: true,
      token,
      organization: {
        id: organization._id,
        address: organization.address,
        name: organization.name,
        email: organization.email,
        description: organization.description
      }
    });
  } catch (error) {
    console.error("Sign in error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { address, name, email, password, description, signature } = req.body;

    // Validate required fields
    if (!address || !name) {
      return res.status(400).json({ error: "Wallet address and name are required" });
    }

    // Check if organization already exists with this address
    const existingOrgByAddress = await Organization.findOne({ 
      address: address.toLowerCase() 
    });
    if (existingOrgByAddress) {
      return res.status(409).json({ error: "Organization with this wallet address already exists" });
    }

    // Check if organization already exists with this email (if provided)
    if (email) {
      const existingOrgByEmail = await Organization.findOne({ 
        email: email.toLowerCase() 
      });
      if (existingOrgByEmail) {
        return res.status(409).json({ error: "Organization with this email already exists" });
      }
    }

    // Hash password if provided
    let hashedPassword;
    if (password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    // Create new organization
    const organization = await Organization.create({
      address: address.toLowerCase(), // Ensure address is lowercase
      name,
      email: email ? email.toLowerCase() : undefined,
      description,
      password: hashedPassword
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        organizationId: organization._id,
        address: organization.address,
        email: organization.email,
        name: organization.name
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ 
      success: true,
      token,
      organization: {
        id: organization._id,
        address: organization.address,
        name: organization.name,
        email: organization.email,
        description: organization.description
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      if (error.keyPattern?.address) {
        return res.status(409).json({ error: "Organization with this wallet address already exists" });
      }
      if (error.keyPattern?.email) {
        return res.status(409).json({ error: "Organization with this email already exists" });
      }
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (!decoded.organizationId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get organization details
    const organization = await Organization.findById(decoded.organizationId).select('-password').lean();
    
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json({
      organization: {
        id: organization._id,
        address: organization.address,
        name: organization.name,
        email: organization.email,
        description: organization.description
      }
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Test endpoint for debugging
router.get('/debug/organizations', async (req: Request, res: Response) => {
  try {
    const organizations = await Organization.find({}).select('-password').lean();
    res.json({
      count: organizations.length,
      organizations: organizations.map(org => ({
        id: org._id,
        name: org.name,
        email: org.email,
        address: org.address,
        hasPassword: !!org.password,
        createdAt: org.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

