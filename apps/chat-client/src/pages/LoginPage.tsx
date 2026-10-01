import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, Shield, User, Lock, Home } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { authService } from '../utils/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import md5 from 'md5';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setUserFromLogin } = useChat();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login(username, md5(password), {
        loginCity: "成都市",
        loginLat: 30.27,
        loginLng: 103.08,
        loginProvince: "四川省",
      });

      if (result.flag && result.data) {
        localStorage.setItem('userInfo', JSON.stringify(result.data.user));
        localStorage.setItem('token', JSON.stringify(result.data.token));
        setUserFromLogin(result.data.user, result.data.token);
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect) {
          navigate(redirect);
        } else {
          navigate(result.data.user.type === '0' ? '/chat' : '/admin');
        }
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError('网络连接错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg overflow-hidden font-body">
      {/* 背景装饰 */}
      <div className="absolute inset-0">
        <div className="absolute top-[20%] left-[15%] h-[400px] w-[400px] bg-sent/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[10%] h-[500px] w-[500px] bg-white/[0.02] blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px] px-6"
      >
        {/* 头部标识 */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sent/10 border border-sent/20 mb-6"
          >
            <MessageCircle className="h-7 w-7 text-sent" />
          </motion.div>
          <h1 className="text-xl font-bold tracking-tight text-text-p mb-2">寒枫的私信</h1>
        </div>

        <Card className="border-border bg-surface/40 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 py-2.5">
                  <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <label className="text-2xs font-medium text-text-s ml-2">账号</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="pl-10 h-11 bg-bg/50 border-border focus:ring-1 focus:ring-sent/40"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs font-medium text-text-s ml-2">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="pl-10 h-11 bg-bg/50 border-border focus:ring-1 focus:ring-sent/40"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-bold tracking-wide mt-2"
                disabled={loading}
              >
                {loading ? "登录中..." : "开始聊天"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/[0.04] flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-xs text-text-dim hover:text-text-p" onClick={() => navigate('/')}>
                <Home className="h-3.5 w-3.5 mr-2" />
                首页
              </Button>
              <div className="flex gap-4">
                <Sparkles className="h-4 w-4 text-text-dim opacity-30" />
                <Shield className="h-4 w-4 text-text-dim opacity-30" />
              </div>
            </div>
          </CardContent>
        </Card>

      </motion.div>
    </div>
  );
};

export default LoginPage;
