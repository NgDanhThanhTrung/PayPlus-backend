import { Router } from 'express';
import { validateTelegramInitData } from '../middlewares/auth';
import * as configController from '../controllers/config';
import * as authController from '../controllers/auth';
import * as adsController from '../controllers/ads';
import * as tasksController from '../controllers/tasks';
import * as withdrawController from '../controllers/withdraw';
import * as inviteController from '../controllers/invite';

const router = Router();

// Public routes
router.get('/config', configController.getConfig);
// Định tuyến webhook nhận sự kiện xem quảng cáo từ Adsgram (Không chặn token)
router.get('/ads/webhook', adsController.handleAdsgramWebhook);

// Protected routes (require initData validation)
router.post('/auth', validateTelegramInitData, authController.authenticate);
router.post('/auth/referral', validateTelegramInitData, authController.processReferral);

router.post('/ads/watch', validateTelegramInitData, adsController.watchAd);
router.get('/ads/status', validateTelegramInitData, adsController.getAdStatus);

router.get('/tasks', validateTelegramInitData, tasksController.getTasks);
router.post('/tasks/check', validateTelegramInitData, tasksController.checkTask);
router.get('/tasks/completed', validateTelegramInitData, tasksController.getCompletedTasks);

router.post('/withdraw', validateTelegramInitData, withdrawController.createWithdrawal);
router.get('/withdraw', validateTelegramInitData, withdrawController.getWithdrawals);

router.get('/invite/info', validateTelegramInitData, inviteController.getReferralInfo);
router.get('/invite/list', validateTelegramInitData, inviteController.getReferrals);

export default router;
