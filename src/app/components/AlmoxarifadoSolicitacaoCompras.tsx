import React, { useState } from 'react';
import { ShoppingCart, Plus, Search, Filter, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export default function AlmoxarifadoSolicitacaoCompras() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[#DC0000]">
            <ShoppingCart className="w-6 h-6" />
            Solicitação de Compras
          </h1>
          <p className="text-[#666666] mt-1">
            Gestão de solicitações de compras de materiais
          </p>
        </div>
        <Button className="bg-[#DC0000] hover:bg-[#B80000] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-[#E5E5E5]">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <Input
              type="text"
              placeholder="Buscar por item, solicitante, fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#E5E5E5]"
            />
          </div>
          <Button variant="outline" className="border-[#E5E5E5]">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#666666]">Pendentes</p>
              <p className="text-[#DC0000] mt-2">12</p>
            </div>
            <Clock className="w-8 h-8 text-[#DC0000] opacity-20" />
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#666666]">Em Análise</p>
              <p className="text-[#DC0000] mt-2">5</p>
            </div>
            <Clock className="w-8 h-8 text-[#DC0000] opacity-20" />
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#666666]">Aprovadas</p>
              <p className="text-[#DC0000] mt-2">28</p>
            </div>
            <CheckCircle className="w-8 h-8 text-[#DC0000] opacity-20" />
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#666666]">Recusadas</p>
              <p className="text-[#DC0000] mt-2">3</p>
            </div>
            <XCircle className="w-8 h-8 text-[#DC0000] opacity-20" />
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-white border-[#E5E5E5]">
        <div className="p-4 border-b border-[#E5E5E5]">
          <h2 className="text-[#1A1A1A]">Solicitações Recentes</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12 text-[#666666]">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma solicitação cadastrada</p>
            <p className="text-sm mt-2">Clique em "Nova Solicitação" para começar</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
