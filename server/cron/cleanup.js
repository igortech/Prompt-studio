"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_cron_1 = require("node-cron");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
// Run every day at midnight
node_cron_1.default.schedule('0 0 * * *', function () { return __awaiter(void 0, void 0, void 0, function () {
    var job, prompts, totalDeleted, _i, prompts_1, prompt_1, cutoffDate, deleted, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('Starting automatic history cleanup job...');
                return [4 /*yield*/, prisma.cleanupJob.create({
                        data: {
                            type: 'messages_cleanup',
                            status: 'running',
                            startedAt: new Date()
                        }
                    })];
            case 1:
                job = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 9, , 11]);
                return [4 /*yield*/, prisma.prompt.findMany({
                        where: { autoCleanup: true }
                    })];
            case 3:
                prompts = _a.sent();
                totalDeleted = 0;
                _i = 0, prompts_1 = prompts;
                _a.label = 4;
            case 4:
                if (!(_i < prompts_1.length)) return [3 /*break*/, 7];
                prompt_1 = prompts_1[_i];
                cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - prompt_1.cleanupDays);
                return [4 /*yield*/, prisma.message.deleteMany({
                        where: {
                            promptId: prompt_1.id,
                            createdAt: {
                                lt: cutoffDate
                            }
                        }
                    })];
            case 5:
                deleted = _a.sent();
                totalDeleted += deleted.count;
                _a.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 4];
            case 7: 
            // Log the job
            return [4 /*yield*/, prisma.cleanupJob.update({
                    where: { id: job.id },
                    data: {
                        deletedCount: totalDeleted,
                        status: 'completed',
                        completedAt: new Date()
                    }
                })];
            case 8:
                // Log the job
                _a.sent();
                console.log("Cleanup job completed successfully. Processed ".concat(prompts.length, " prompts, deleted ").concat(totalDeleted, " messages."));
                return [3 /*break*/, 11];
            case 9:
                error_1 = _a.sent();
                console.error('Error during cleanup job:', error_1);
                return [4 /*yield*/, prisma.cleanupJob.update({
                        where: { id: job.id },
                        data: {
                            status: 'failed',
                            completedAt: new Date()
                        }
                    })];
            case 10:
                _a.sent();
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
