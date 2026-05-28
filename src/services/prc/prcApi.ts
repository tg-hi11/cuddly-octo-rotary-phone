import axios, { AxiosInstance, AxiosError } from 'axios';
import { Config } from '../../config/config';
import {
  PRCServerInfo,
  PRCPlayer,
  PRCKillLog,
  PRCJoinLog,
  PRCCommandLog,
  PRCModCall,
  PRCVehicle,
  PRCQueue,
} from '../../types';
import { logger } from '../../utils/logger';

class PRCApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: Config.erlcBaseUrl,
      timeout: 10000,
    });

    // ── Request interceptor: inject API key fresh on every call ──────────────
    // This ensures a key update via env var is always picked up without restart.
    this.client.interceptors.request.use((config) => {
      const key = process.env.ERLC_API_KEY ?? Config.erlcApiKey;
      config.headers['Server-Key'] = key;
      config.headers['Content-Type'] = 'application/json';
      return config;
    });

    // ── Response interceptor: structured error messages ───────────────────────
    this.client.interceptors.response.use(
      (res) => res,
      (error: AxiosError) => {
        const status   = error.response?.status;
        const body     = error.response?.data;

        // Log the raw API response so we can debug key issues
        logger.error('PRC API', `HTTP ${status} — ${JSON.stringify(body)}`);

        const message =
          status === 401 ? 'Invalid API Key — regenerate it in the PRC developer portal.'
          : status === 403 ? 'Access forbidden — your Server Key may be wrong, expired, or not linked to an active private server.'
          : status === 404 ? 'Resource not found — the server may be offline.'
          : status === 429 ? 'Rate limited — too many requests. Try again in a moment.'
          : status === 500 ? 'PRC API internal error. Try again later.'
          : `PRC API error ${status}: ${error.message}`;

        throw new Error(message);
      }
    );
  }

  async getServerInfo(): Promise<PRCServerInfo> {
    const res = await this.client.get<PRCServerInfo>('/server');
    return res.data;
  }

  async getPlayers(): Promise<PRCPlayer[]> {
    const res = await this.client.get<Record<string, PRCPlayer>>('/server/players');
    // API returns an object keyed by player name — normalise to array
    if (Array.isArray(res.data)) return res.data;
    return Object.values(res.data);
  }

  async getQueue(): Promise<PRCQueue> {
    const res = await this.client.get<PRCQueue>('/server/queue');
    return res.data;
  }

  async getKillLogs(): Promise<PRCKillLog[]> {
    const res = await this.client.get<PRCKillLog[]>('/server/killlogs');
    return Array.isArray(res.data) ? res.data : [];
  }

  async getJoinLogs(): Promise<PRCJoinLog[]> {
    const res = await this.client.get<PRCJoinLog[]>('/server/joinlogs');
    return Array.isArray(res.data) ? res.data : [];
  }

  async getCommandLogs(): Promise<PRCCommandLog[]> {
    const res = await this.client.get<PRCCommandLog[]>('/server/commandlogs');
    return Array.isArray(res.data) ? res.data : [];
  }

  async getModCalls(): Promise<PRCModCall[]> {
    const res = await this.client.get<PRCModCall[]>('/server/modcalls');
    return Array.isArray(res.data) ? res.data : [];
  }

  async getVehicles(): Promise<PRCVehicle[]> {
    const res = await this.client.get<Record<string, PRCVehicle>>('/server/vehicles');
    if (Array.isArray(res.data)) return res.data;
    return Object.values(res.data);
  }

  async executeCommand(command: string): Promise<void> {
    await this.client.post('/server/command', { command });
  }

  async getStaff(): Promise<PRCPlayer[]> {
    const players = await this.getPlayers();
    return players.filter(
      (p) =>
        p.Permission === 'Server Moderator' ||
        p.Permission === 'Server Administrator' ||
        p.Permission === 'Server Owner'
    );
  }
}

export const prcApi = new PRCApiService();
