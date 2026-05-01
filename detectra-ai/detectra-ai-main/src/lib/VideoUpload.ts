import { AnalysisResult } from './detectraApi';

export interface VideoUpload {
  id: string;
  user_id: string;
  video_url: string;
  title: string;
  description: string | null;
  status: 'processing' | 'completed' | 'failed';
  analysis_results: AnalysisResult | null;
  created_at: string;
  updated_at: string;
}
