import { X, AlertTriangle } from "lucide-react"
import { Button } from "~components/ui/button"
import { Card } from "~components/ui/card"


export const RefreshWarningOverlay = ({ onRefresh, onClose }) => {
    return (
        <Card className="absolute z-10 bg-red-200 p-2 px-4 w-80 mt-3 drop-shadow-xl">
        <div className="absolute -top-2 left-1/3 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-black"></div>
            <button
                onClick={onClose}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
                aria-label="Close">
                <X className="h-5 w-5" />
            </button>
            <div className="flex items-center mb-2 text-red-800">
                <AlertTriangle className="mr-2 h-6 w-6" />
                <h3 className="font-semibold text-base">Warning</h3>
            </div>
            <p className="text-xs mb-1">
                Refreshing too often may cause issues with LinkedIn.
                It is recommended refresh once every couple hours.
            </p>
            <div className="flex justify-end mb-2">
                <Button size="sm" onClick={onRefresh} className="text-xs">
                    Refresh Anyway
                </Button>
            </div>
        </Card>
    )
}
