'use client'

import { useState, useEffect, useRef } from 'react'
import { StepProps } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, ArrowRight, ArrowLeft, Search, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ZipResult {
  zip_code: string
  city: string
  county: string
}

export default function ServiceAreasForm({ data, onChange, onNext, onBack, isSubmitting }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ZipResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const searchZipCodes = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    setSearching(true)
    try {
      // Search by zip code or city name
      const isZip = /^\d+$/.test(query)
      let results: ZipResult[] = []

      if (isZip) {
        const { data: zipData } = await supabase
          .from('florida_zipcodes')
          .select('zip_code, city, county')
          .ilike('zip_code', `${query}%`)
          .limit(20)
        results = zipData || []
      } else {
        const { data: cityData } = await supabase
          .from('florida_zipcodes')
          .select('zip_code, city, county')
          .ilike('city', `%${query}%`)
          .limit(20)
        results = cityData || []
      }

      setSearchResults(results)
      setShowDropdown(results.length > 0)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchZipCodes(value)
    }, 300)
  }

  const addZipCode = (zip: string) => {
    const currentAreas = data.service_areas || []
    if (!currentAreas.includes(zip)) {
      onChange({ ...data, service_areas: [...currentAreas, zip] })
    }
    if (errors.service_areas) {
      setErrors({ ...errors, service_areas: '' })
    }
  }

  const removeZipCode = (zip: string) => {
    const currentAreas = data.service_areas || []
    onChange({ ...data, service_areas: currentAreas.filter((z) => z !== zip) })
  }

  const addAllFromCity = (city: string) => {
    const cityZips = searchResults
      .filter((r) => r.city === city)
      .map((r) => r.zip_code)
    const currentAreas = data.service_areas || []
    const newAreas = [...new Set([...currentAreas, ...cityZips])]
    onChange({ ...data, service_areas: newAreas })
    if (errors.service_areas) {
      setErrors({ ...errors, service_areas: '' })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!data.service_areas || data.service_areas.length === 0) {
      newErrors.service_areas = 'Please add at least one service area'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext()
    }
  }

  // Group search results by city for "add all" buttons
  const citiesInResults = [...new Set(searchResults.map((r) => r.city))]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Service Areas</h2>
        <p className="text-gray-600 mt-1">Select the Florida ZIP codes you serve</p>
      </div>

      {/* Search */}
      <div className="space-y-2 relative" ref={dropdownRef}>
        <Label className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search by ZIP code or city name
        </Label>
        <div className="relative">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="e.g. 32801 or Orlando"
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          />
          {searching && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        {errors.service_areas && (
          <p className="text-sm text-red-500">{errors.service_areas}</p>
        )}

        {/* Dropdown results */}
        {showDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {citiesInResults.length > 1 && searchQuery.length >= 2 && !(/^\d+$/.test(searchQuery)) && (
              <div className="px-3 py-2 border-b bg-gray-50">
                {citiesInResults.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => addAllFromCity(city)}
                    className="text-xs text-blue-600 hover:text-blue-800 mr-3"
                  >
                    + All {city} ZIPs
                  </button>
                ))}
              </div>
            )}
            {searchResults.map((result) => {
              const isSelected = data.service_areas?.includes(result.zip_code)
              return (
                <button
                  key={result.zip_code}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      removeZipCode(result.zip_code)
                    } else {
                      addZipCode(result.zip_code)
                    }
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    isSelected ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <span>
                    <span className="font-medium">{result.zip_code}</span>
                    {' — '}
                    {result.city}, {result.county} County
                  </span>
                  {isSelected && <span className="text-blue-600 text-xs font-medium">Selected</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected areas */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Selected Service Areas ({data.service_areas?.length || 0})
        </Label>
        {data.service_areas && data.service_areas.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.service_areas.map((zip) => (
              <span
                key={zip}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {zip}
                <button
                  type="button"
                  onClick={() => removeZipCode(zip)}
                  className="hover:text-green-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No areas selected yet. Search above to add ZIP codes.
          </p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={isSubmitting}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
