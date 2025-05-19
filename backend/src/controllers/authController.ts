import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { BlacklistedToken } from '../models/BlacklistedToken';
import { AppError } from '../middleware/error';


const filterObj = (obj: any, ...allowedFields: string[]) => {
  const newObj: any = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
  }
}

interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

const signToken = (id: string): { token: string; expiresIn: number } => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '90d';
  
  // Calculate expiration time (default to 90 days if parsing fails)
  const expiresInDays = parseInt(expiresIn) || 90;
  const expiresInMs = expiresInDays * 24 * 60 * 60 * 1000;
  const expiresAt = Date.now() + expiresInMs;
  
  // Calculate expiration time in seconds for JWT
  const exp = Math.floor(expiresAt / 1000);
  
  const token = jwt.sign(
    { 
      id,
      iat: Math.floor(Date.now() / 1000), // issued at
      exp // expiration time
    },
    secret
  );
  
  return {
    token,
    expiresIn: expiresAt
  };
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      role: 'user' as const, // Default role
    });

    if (!newUser._id) {
      return next(new AppError('Error creating user', 500));
    }

    const token = signToken(newUser._id.toString()); // _id is available on Document type

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !('password' in user) || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 3) If everything ok, generate token
    const { token, expiresIn } = signToken(user._id ? user._id.toString() : '');

    // 4) Send token to client via cookie and response
    const cookieOptions = {
      expires: new Date(expiresIn),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    // Set cookie
    res.cookie('jwt', token, cookieOptions);

    // Remove password from output
    (user as any).password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (err) {
    next(err);
  }
};

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) Get token from header or cookies
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }

    // 3) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
    
    if (!decoded?.id) {
      return next(new AppError('Invalid authentication token.', 401));
    }

    // 4) Check if user still exists
    const currentUser = await User.findById(decoded.id).select('+password');
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 5) Check if user changed password after the token was issued
    const userDoc = currentUser as IUser & { changedPasswordAfter: (timestamp: number) => boolean };
    if (userDoc.changedPasswordAfter(decoded.iat || 0)) {
      return next(new AppError('User recently changed password! Please log in again.', 401));
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    res.locals.user = currentUser; // Make user available to templates
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    } else if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token. Please log in again!', 401));
    }
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header or cookies
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('No token provided', 401));
    }
    
    try {
      // Verify token to get expiration time
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
      
      // Add token to blacklist
      await BlacklistedToken.create({
        token,
        expiresAt: new Date(decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000) // Default to 24h if no exp
      });
      
      // Clear the JWT cookie if using cookies
      res.clearCookie('jwt');
      
      res.status(200).json({ 
        status: 'success',
        message: 'Successfully logged out. Token has been invalidated.'
      });
    } catch (err) {
      // If token is invalid but we still want to respond with success
      // as the goal is to ensure the user is logged out
      res.status(200).json({
        status: 'success',
        message: 'Successfully logged out.'
      });
    }
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // The protect middleware should have already set req.user
    if (!req.user) {
      return next(new AppError('Please log in to access this route', 401));
    }

    // Get fresh user data from the database
    const currentUser = await User.findById(req.user._id).select('-__v -password -passwordChangedAt');
    
    if (!currentUser) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: currentUser
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) Ensure user is authenticated
    if (!req.user) {
      return next(new AppError('You are not authenticated', 401));
    }

    // 2) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'This route is not for password updates. Please use /updateMyPassword.',
          400
        )
      );
    }

    // 3) Filter out unwanted fields that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');

    // 4) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};