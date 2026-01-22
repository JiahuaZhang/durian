import { useNavigate } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const POPULAR_SYMBOLS = [
    { symbol: '^SPX', name: 'S&P 500' },
    { symbol: '^NDX', name: 'Nasdaq 100' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'GOOG', name: 'Alphabet' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'INTC', name: 'Intel' },
    { symbol: 'AMD', name: 'AMD' },
    { symbol: 'SNDK', name: 'Sandisk' },
    { symbol: 'MU', name: 'Micron' },
    { symbol: 'META', name: 'Meta' },
    { symbol: 'NFLX', name: 'Netflix' },
]

export function SymbolSearch({ initialValue = '' }: { initialValue?: string }) {
    const navigate = useNavigate()
    const [value, setValue] = useState(initialValue)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const handleSubmit = (e?: React.FormEvent, symbol: string = value) => {
        e?.preventDefault()
        if (!symbol.trim()) return

        navigate({
            to: '/analysis',
            search: { symbol: symbol.toUpperCase() },
        })
        setShowSuggestions(false)
        setValue(symbol.toUpperCase())
    }

    const filteredSymbols = POPULAR_SYMBOLS.filter(s =>
        s.symbol.toLowerCase().includes(value.toLowerCase()) ||
        s.name.toLowerCase().includes(value.toLowerCase())
    )

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    return (
        <div ref={wrapperRef} un-position="relative" un-w="md">
            <form onSubmit={handleSubmit}>
                <div un-flex="~ items-center gap-2" un-border="~ slate-200 rounded-lg" un-p="x-3 y-2" un-focus-within="ring-2 ring-blue-500 border-transparent">
                    <Search un-text="slate-400" size={20} />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value)
                            setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search symbol (e.g. AAPL, ^SPX)..."
                        un-outline="none"
                        un-w="full"
                        un-text="slate-700"
                    />
                    {value && (
                        <button
                            type="button"
                            un-text="slate-400 hover:slate-600"
                            un-p="1"
                            un-cursor="pointer"
                            onClick={() => {
                                setValue('')
                                setShowSuggestions(true)
                            }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </form>

            {showSuggestions && (value || filteredSymbols.length > 0) && (
                <div un-position="absolute top-full left-0 right-0"
                    un-bg="white"
                    un-border="~ slate-200 rounded-lg"
                    un-shadow="lg"
                    un-z="50"
                    un-max-h="80"
                    un-overflow-y="auto"
                >
                    {filteredSymbols.length > 0 ? (
                        filteredSymbols.map((item) => (
                            <button
                                key={item.symbol}
                                onClick={() => handleSubmit(undefined, item.symbol)}
                                un-w="full"
                                un-p="x-4 y-2"
                                un-hover="bg-slate-50"
                                un-flex="~ justify-between items-center"
                                un-border-b="~ last:none slate-100"
                            >
                                <span un-font="bold" un-text="slate-700">{item.symbol}</span>
                                <span un-text="sm slate-400">{item.name}</span>
                            </button>
                        ))
                    ) : (
                        <div un-p="3" un-text="center slate-400 text-sm">
                            Press Enter to search "{value}"
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
