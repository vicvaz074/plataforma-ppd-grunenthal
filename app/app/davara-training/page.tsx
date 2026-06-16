"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  BookOpen, Search, Calendar, Award, BarChart3,
  GraduationCap, FolderOpen
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CatalogoProgramas } from "./components/CatalogoProgramas"
import { DeteccionNecesidades } from "./components/DeteccionNecesidades"
import { AgendaEjecucion } from "./components/AgendaEjecucion"
import { EvaluacionAcreditacion } from "./components/EvaluacionAcreditacion"
import { DashboardReportes } from "./components/DashboardReportes"
import { RecursosMateriales } from "./components/RecursosMateriales"

type TabKey = "dashboard" | "catalogo" | "dnc" | "agenda" | "evaluacion" | "recursos"

interface TabDef {
  key: TabKey
  label: string
  shortLabel: string
  icon: React.ReactNode
  number: string
}

const TABS: TabDef[] = [
  { key: "dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: <BarChart3 className="h-4 w-4" />, number: "3.5" },
  { key: "catalogo", label: "Catálogo de Programas", shortLabel: "Programas", icon: <BookOpen className="h-4 w-4" />, number: "3.1" },
  { key: "dnc", label: "Detección de Necesidades", shortLabel: "DNC", icon: <Search className="h-4 w-4" />, number: "3.2" },
  { key: "agenda", label: "Agenda y Ejecución", shortLabel: "Sesiones", icon: <Calendar className="h-4 w-4" />, number: "3.3" },
  { key: "evaluacion", label: "Evaluación y Acreditación", shortLabel: "Evaluación", icon: <Award className="h-4 w-4" />, number: "3.4" },
  { key: "recursos", label: "Recursos y Materiales", shortLabel: "Recursos", icon: <FolderOpen className="h-4 w-4" />, number: "3.6" },
]

export default function TrainingModulePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                <GraduationCap className="h-7 w-7 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Módulo de Capacitación</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Programa de Capacitación, Actualización y Concientización · SGSDP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">Art. 48 RLFPDPPP</Badge>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">Numeral 23 GISGSDP</Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Paso 9 SGSDP</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — clean, padded, cohesive design with sliding pill background */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto min-w-0 max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/50 bg-slate-100/80 p-1 scrollbar-hide md:w-fit">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shrink-0 z-10 select-none ${
                    isActive
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}>
                  
                  {isActive && (
                    <motion.div
                      layoutId="clean-tab-bg"
                      className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/60"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  <span className="relative z-10 flex items-center gap-2.5">
                    <span className={`transition-colors duration-300 ${isActive ? "text-blue-600" : ""}`}>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {activeTab === "dashboard" && <DashboardReportes />}
          {activeTab === "catalogo" && <CatalogoProgramas />}
          {activeTab === "dnc" && <DeteccionNecesidades />}
          {activeTab === "agenda" && <AgendaEjecucion />}
          {activeTab === "evaluacion" && <EvaluacionAcreditacion />}
          {activeTab === "recursos" && <RecursosMateriales />}
        </motion.div>
      </div>
    </div>
  )
}
