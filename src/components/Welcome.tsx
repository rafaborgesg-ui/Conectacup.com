import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  ArrowRight, 
  Users, 
  Zap, 
  Target,
  Package,
  BarChart3,
  Shield,
  Workflow
} from 'lucide-react';

interface WelcomeProps {
  onNavigate: (module: string) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNavigate }) => {

  const features = [
    {
      icon: Package,
      title: 'Gestão de Estoque',
      description: 'Controle completo do estoque de pneus com rastreabilidade e histórico detalhado.'
    },
    {
      icon: Workflow,
      title: 'Processos Digitais',
      description: 'Automatização de processos internos para maior eficiência e produtividade.'
    },
    {
      icon: Users,
      title: 'Colaboração',
      description: 'Integração entre áreas para facilitar a comunicação e o trabalho conjunto.'
    },
    {
      icon: BarChart3,
      title: 'Relatórios & Analytics',
      description: 'Dashboards e relatórios em tempo real para tomada de decisões estratégicas.'
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Controle de acesso baseado em perfis para garantir a segurança das informações.'
    },
    {
      icon: Zap,
      title: 'Eficiência',
      description: 'Ferramentas modernas para otimizar tempo e recursos em todas as operações.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#DC0000] to-[#A00000] text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm mb-4">
                <Target className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-6 tracking-tight">
              Bem-vindo à <span className="font-bold">Conecta Cup</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              Intranet corporativa Porsche Cup Brasil para processos integrados e colaborativos.
            </p>
            
          </div>
        </div>
        
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* About Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl text-neutral-900 mb-4">
            O que é <span className="text-[#DC0000]">Conecta Cup</span>?
          </h2>
          <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
            A Conecta Cup é a plataforma digital que conecta os colaboradores da Cup, 
            proporcionando uma experiência integrada para gerenciar processos internos, 
            facilitar a comunicação entre áreas e impulsionar a colaboração através de 
            ferramentas modernas e eficientes.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group hover:shadow-xl transition-all duration-300 border-neutral-200 hover:border-[#DC0000]/30 cursor-default"
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#DC0000] to-[#A00000] flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg text-neutral-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-neutral-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-2xl p-8 sm:p-12 text-white shadow-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#DC0000] mb-6">
              <Target className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl mb-4">
              Missão
            </h2>
            <p className="text-lg text-neutral-300 leading-relaxed mb-8">
              Integrar os colaboradores Cup em um único ecossistema digital, 
              eliminando barreiras entre departamentos e criando um ambiente de 
              trabalho mais ágil, transparente e colaborativo. Através de processos 
              digitalizados e automatizados, buscamos maximizar a eficiência operacional 
              e promover uma cultura de inovação contínua.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              <div className="text-center">
                <div className="text-3xl text-[#DC0000] mb-1">100%</div>
                <div className="text-neutral-400">Digital</div>
              </div>
              <div className="text-center">
                <div className="text-3xl text-[#DC0000] mb-1">24/7</div>
                <div className="text-neutral-400">Disponível</div>
              </div>
              <div className="text-center">
                <div className="text-3xl text-[#DC0000] mb-1">∞</div>
                <div className="text-neutral-400">Possibilidades</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        
      </div>

      {/* Footer Note */}
      <div className="border-t border-neutral-200 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-neutral-500">
            Conecta Cup &copy; 2025 - Plataforma de Gestão Integrada
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
