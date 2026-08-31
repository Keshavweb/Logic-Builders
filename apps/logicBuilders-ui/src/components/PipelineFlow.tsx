import { useState } from 'react'

export default function PipelineFlow() {
  const [activeStep, setActiveStep] = useState<number>(1)

  const steps = [
    {
      id: 1,
      tag: '01 / INTAKE',
      title: 'Dispute Ingestion',
      desc: 'Webhook/CSV trigger catches reason codes & transaction metadata.',
      accent: 'blue',
      progressWidth: 'w-1/4',
      borderColor: 'border-blue-500 hover:border-blue-500/60 ring-blue-500/50',
      dotColor: 'bg-blue-400',
      titleHover: 'group-hover:text-blue-400',
      barColor: 'bg-blue-500',
    },
    {
      id: 2,
      tag: '02 / FETCH',
      title: 'Evidence Correlation',
      desc: 'Cross-checks tracking numbers, IP logs, AVS match, and order history.',
      accent: 'purple',
      progressWidth: 'w-1/2',
      borderColor: 'border-purple-500 hover:border-purple-500/60 ring-purple-500/50',
      dotColor: 'bg-purple-400',
      titleHover: 'group-hover:text-purple-400',
      barColor: 'bg-purple-500',
    },
    {
      id: 3,
      tag: '03 / SYNTHESIS',
      title: 'LLM Evidence Draft',
      desc: 'Generates legal defense letters tailored to gateway character rules.',
      accent: 'emerald',
      progressWidth: 'w-3/4',
      borderColor: 'border-emerald-500 hover:border-emerald-500/60 ring-emerald-500/50',
      dotColor: 'bg-emerald-400',
      titleHover: 'group-hover:text-emerald-400',
      barColor: 'bg-emerald-500',
    },
    {
      id: 4,
      tag: '04 / GATE',
      title: 'Human Review & Submit',
      desc: 'Merchant inspects AI draft, edits proof, and approves final submission.',
      accent: 'amber',
      progressWidth: 'w-full',
      borderColor: 'border-amber-500 hover:border-amber-500/60 ring-amber-500/50',
      dotColor: 'bg-amber-400',
      titleHover: 'group-hover:text-amber-400',
      barColor: 'bg-amber-500',
    },
  ]

  return (
    /* Changed max-w-5xl to max-w-6xl & mx-auto for perfect centering. Fixed mt-23 to mt-16 */
    <div className="max-w-6xl w-full mx-auto mt-23 relative z-10 text-left px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            Execution Architecture
          </p>
          <h2 className="text-xl font-bold text-white mt-1">
            RocketRide Multi-Agent Defense Pipeline
          </h2>
        </div>
        <span className="flex items-center gap-2 text-xs bg-blue-950/60 border border-blue-800/80 text-blue-300 px-3 py-1 rounded-full">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping"></span>
          Real-Time Orchestration
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {/* Connecting Line */}
        <div className="hidden md:block absolute top-1/2 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/30 to-emerald-500/20 -translate-y-1/2 z-0 pointer-events-none"></div>

        {steps.map((step) => {
          const isActive = activeStep === step.id
          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`relative z-10 p-5 rounded-xl bg-gray-900/90 border cursor-pointer backdrop-blur-md transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/50 group ${
                isActive
                  ? `${step.borderColor} ring-1`
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-500">{step.tag}</span>
                <span className={`h-2 w-2 rounded-full ${step.dotColor} group-hover:animate-ping`}></span>
              </div>
              <h3 className={`text-sm font-bold text-white mb-1 transition ${step.titleHover}`}>
                {step.title}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                {step.desc}
              </p>
              <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                <div className={`${step.barColor} h-1 rounded-full ${step.progressWidth} animate-pulse`}></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}