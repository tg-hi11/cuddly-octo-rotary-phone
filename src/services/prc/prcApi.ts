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

class PRCApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: Config.erlcBaseUrl,
      headers: {
        'Server-Key': Config.erlcApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (res) => res,
      (error: AxiosError) => {
        const status = error.response?.status;
        const message =
          status === 401 ? 'Invalid API Key.'
          : status === 403 ? 'Access forbidden — check your server key.'
          : status === 404 ? 'Resource not found.'
          : status === 429 ? 'Rate limited — slow down requests.'
          : status === 500 ? 'PRC API server error.'
          : `API error: ${error.message}`;
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
    return Object.values(res.data);
  }

  async getQueue(): Promise<PRCQueue> {
    const res = await this.client.get<PRCQueue>('/server/queue');
    return res.data;
  }

  async getKillLogs(): Promise<PRCKillLog[]> {
    const res = await this.client.get<PRCKillLog[]>('/server/killlogs');
    return res.data;
  }

  async getJoinLogs(): Promise<PRCJoinLog[]> {
    const res = await this.client.get<PRCJoinLog[]>('/server/joinlogs');
    return res.data;
  }

  async getCommandLogs(): Promise<PRCCommandLog[]> {
    const res = await this.client.get<PRCCommandLog[]>('/server/commandlogs');
    return res.data;
  }

  async getModCalls(): Promise<PRCModCall[]> {
    const res = await this.client.get<PRCModCall[]>('/server/modcalls');
    return res.data;
  }

  async getVehicles(): Promise<PRCVehicle[]> {
    const res = await this.client.get<Record<string, PRCVehicle>>('/server/vehicles');
    return Object.values(res.data);
  }

  async executeCommand(command: string): Promise<void> {
    await this.client.post('/server/command', { command });
  }

  /** Returns only players with Moderator or Administrator permission */
  async getStaff(): Promise<PRCPlayer[]> {
    const players = await this.getPlayers();
    return players.filter(
      (p) => p.Permission === 'Server Moderator' || p.Permission === 'Server Administrator' || p.Permission === 'Server Owner'
    );
  }
}

export const prcApi = new PRCApiService();
