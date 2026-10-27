import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import authRoutes from './routes/auth.routes.js';
import contentRoutes from './routes/content.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import chatRoutes from './routes/chat.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import socialRoutes from './routes/social.routes.js';
import socialContentMiddleware from './middleware/socialContent.middleware.js';
import { ensureDefaultPlans } from './config/postPlans.js';
import { processExpiredContent } from './services/contentLifecycle.js';

const app=express();
const allowed=[process.env.USER_APP_URL,process.env.ADMIN_APP_URL].filter(Boolean);
app.use(cors({origin(origin,cb){if(!origin||allowed.length===0||allowed.includes(origin))return cb(null,true);cb(new Error('CORS blocked'));},credentials:true}));
app.use(express.json({limit:'2mb'}));
app.use(morgan('dev'));
configureCloudinary();

app.get('/api/health',(req,res)=>res.json({ok:true,service:'namma-madurandhagam-api',time:new Date().toISOString()}));
app.use('/api/auth',authRoutes);
app.use('/api/content',socialContentMiddleware,contentRoutes);
app.use('/api/social',socialRoutes);
app.use('/api/payments',paymentRoutes);
app.use('/api/upload',uploadRoutes);
app.use('/api/chat',chatRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api/notifications',notificationRoutes);
app.use((err,req,res,next)=>{console.error(err);res.status(err.status||500).json({message:err.message||'Internal server error'});});

const port=Number(process.env.PORT||5000);
connectDB().then(async()=>{
  await ensureDefaultPlans().catch(console.error);
  processExpiredContent().catch(console.error);
  setInterval(()=>processExpiredContent().catch(console.error),60*60*1000).unref();
  app.listen(port,()=>console.log(`Namma Madurandhagam API running on port ${port}`));
}).catch(err=>{console.error('Startup failed',err);process.exit(1)});
