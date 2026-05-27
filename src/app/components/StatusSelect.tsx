import { useTireStatus } from '../utils/TireStatusContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface StatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
  id?: string;
}

export function StatusSelect({
  value,
  onValueChange,
  placeholder = 'Selecione o status',
  includeAll = false,
  allLabel = 'Todos os status',
  disabled = false,
  id,
}: StatusSelectProps) {
  const { statusList } = useTireStatus();

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">{allLabel}</SelectItem>
        )}
        {statusList.map((status) => (
          <SelectItem key={status.id} value={status.name}>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <span>{status.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
