'use client'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface SelectItem {
  label: string
  value: string
}

interface SelectProps {
  items: SelectItem[]
  onSelect: (value: string | null) => void
  value: string | null
}

export default function Select({ items, onSelect, value }: SelectProps) {
  const [isActiveSelect, setIsActiveSelect] = useState(false)

  const handleItemClick = (itemValue: string) => {
    onSelect(itemValue)
    setIsActiveSelect(false)
  }

  const selectedItem = items.find(item => item.value === value)

  return (
    <div
      data-state={isActiveSelect ? 'open' : 'closed'}
      className="relative group text-text"
      aria-expanded={isActiveSelect}
    >
      <button
        onClick={() => {
          setIsActiveSelect(!isActiveSelect)
        }}
        onBlur={() => {
          setIsActiveSelect(false)
        }}
        aria-haspopup="listbox"
        aria-labelledby="select-label"
        className="flex min-w-[160px] w-max cursor-pointer items-center rounded-base border-2 border-border dark:border-darkBorder bg-main px-10 py-3 font-base shadow-light dark:shadow-dark transition-all active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none dark:active:shadow-none"
      >
        <div className="mx-auto flex items-center text-base">
          {selectedItem ? selectedItem.label : 'Select'}
          <ChevronDown
            className={
              'ml-2 h-5 w-5 transition-transform group-data-[state=open]:rotate-180 group-data-[state=closed]:rotate-0 ease-in-out'
            }
          />
        </div>
      </button>
      <div
        role="listbox"
        aria-labelledby="select-label"
        className="absolute left-0 min-w-[160px] w-max group-data-[state=open]:top-20 group-data-[state=open]:shadow-lg group-data-[state=open]:opacity-100 group-data-[state=closed]:invisible group-data-[state=closed]:top-[50px] group-data-[state=closed]:opacity-0 group-data-[state=open]:visible rounded-base border-2 border-border dark:border-darkBorder font-base shadow-light dark:shadow-dark transition-all"
        style={{ zIndex: 9999 }}
      >
        {items.map((item, index) => {
          return (
            <button
              key={index}
              onClick={() => {
                handleItemClick(item.value)
              }}
              className="block w-full text-sm border-b-2 border-border dark:border-darkBorder bg-main px-5 py-3 first:rounded-t-base last:rounded-b-base hover:bg-mainAccent"
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}