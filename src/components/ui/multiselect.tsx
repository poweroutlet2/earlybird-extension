"use client";
import { Command as CommandPrimitive } from "cmdk";
import { X as RemoveIcon, Check } from "lucide-react";
import React, {
    type KeyboardEvent,
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useState,
} from "react";
import { Badge } from "./badge";
import { Command, CommandEmpty, CommandItem, CommandList } from "./command";
import { cn } from "~lib/utils";

interface MultiSelectorButtonProps {
    className?: string;
}

interface MultiSelectorBadgeProps {
    className?: string;
}

interface MultiSelectorProps
    extends React.ComponentPropsWithoutRef<typeof CommandPrimitive> {
    values: string[];
    onValuesChange: (value: string[]) => void;
    loop?: boolean;
    buttonProps?: MultiSelectorButtonProps;
    badgeProps?: MultiSelectorBadgeProps;
    inputValue?: string;
    onInputValueChange?: (value: string) => void;
}

interface MultiSelectContextProps {
    value: string[];
    onValueChange: (value: any) => void;
    open: boolean;
    setOpen: (value: boolean) => void;
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    activeIndex: number;
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
    ref: React.RefObject<HTMLInputElement>;
    handleSelect: (e: React.SyntheticEvent<HTMLInputElement>) => void;
    badgeProps?: MultiSelectorBadgeProps;
}

const MultiSelectContext = createContext<MultiSelectContextProps | null>(null);

const useMultiSelect = () => {
    const context = useContext(MultiSelectContext);
    if (!context) {
        throw new Error("useMultiSelect must be used within MultiSelectProvider");
    }
    return context;
};

/**
 * MultiSelect Docs: {@link: https://shadcn-extension.vercel.app/docs/multi-select}
 */

// TODO : expose the visibility of the popup

const MultiSelector = ({
    values: value,
    onValuesChange: onValueChange,
    loop = false,
    className,
    buttonProps,
    badgeProps,
    children,
    dir,
    inputValue: externalInputValue,
    onInputValueChange,
    ...props
}: MultiSelectorProps) => {
    const [internalInputValue, setInternalInputValue] = useState("");
    const [open, setOpen] = useState<boolean>(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isValueSelected, setIsValueSelected] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState("");

    const inputValue = externalInputValue !== undefined ? externalInputValue : internalInputValue;
    const setInputValue = (value: string) => {
        if (onInputValueChange) {
            onInputValueChange(value);
        } else {
            setInternalInputValue(value);
        }
    };

    const onValueChangeHandler = useCallback(
        (val: string) => {
            if (value.includes(val)) {
                onValueChange(value.filter((item) => item !== val));
            } else {
                onValueChange([...value, val]);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value],
    );

    const handleSelect = React.useCallback(
        (e: React.SyntheticEvent<HTMLInputElement>) => {
            e.preventDefault();
            const target = e.currentTarget;
            const selection = target.value.substring(
                target.selectionStart ?? 0,
                target.selectionEnd ?? 0,
            );

            setSelectedValue(selection);
            setIsValueSelected(selection === inputValue);
        },
        [inputValue],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            e.stopPropagation();
            const target = inputRef.current;

            if (!target) return;

            const moveNext = () => {
                const nextIndex = activeIndex + 1;
                setActiveIndex(
                    nextIndex > value.length - 1 ? (loop ? 0 : -1) : nextIndex,
                );
            };

            const movePrev = () => {
                const prevIndex = activeIndex - 1;
                setActiveIndex(prevIndex < 0 ? value.length - 1 : prevIndex);
            };

            const moveCurrent = () => {
                const newIndex =
                    activeIndex - 1 <= 0
                        ? value.length - 1 === 0
                            ? -1
                            : 0
                        : activeIndex - 1;
                setActiveIndex(newIndex);
            };

            switch (e.key) {
                case "ArrowLeft":
                    if (dir === "rtl") {
                        if (value.length > 0 && (activeIndex !== -1 || loop)) {
                            moveNext();
                        }
                    } else {
                        if (value.length > 0 && target.selectionStart === 0) {
                            movePrev();
                        }
                    }
                    break;

                case "ArrowRight":
                    if (dir === "rtl") {
                        if (value.length > 0 && target.selectionStart === 0) {
                            movePrev();
                        }
                    } else {
                        if (value.length > 0 && (activeIndex !== -1 || loop)) {
                            moveNext();
                        }
                    }
                    break;

                case "Backspace":
                case "Delete":
                    if (value.length > 0) {
                        if (activeIndex !== -1 && activeIndex < value.length) {
                            onValueChangeHandler(value[activeIndex]);
                            moveCurrent();
                        } else {
                            if (target.selectionStart === 0) {
                                if (selectedValue === inputValue || isValueSelected) {
                                    onValueChangeHandler(value[value.length - 1]);
                                }
                            }
                        }
                    }
                    break;

                case "Enter":
                    setOpen(true);
                    break;

                case "Escape":
                    if (activeIndex !== -1) {
                        setActiveIndex(-1);
                    } else if (open) {
                        setOpen(false);
                    }
                    break;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value, inputValue, activeIndex, loop],
    );

    return (
        <MultiSelectContext.Provider
            value={{
                value,
                onValueChange: onValueChangeHandler,
                open,
                setOpen,
                inputValue,
                setInputValue,
                activeIndex,
                setActiveIndex,
                ref: inputRef,
                handleSelect,
                badgeProps
            }}
        >
            <Command
                onKeyDown={handleKeyDown}
                className={cn(
                    "overflow-visible bg-transparent flex flex-col space-y-2",
                    className,
                )}
                dir={dir}
                {...props}
            >
                {children}
            </Command>
        </MultiSelectContext.Provider>
    );
};

const MultiSelectorTrigger = forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { value, onValueChange, activeIndex, badgeProps } = useMultiSelect();

    const mousePreventDefault = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    return (
        <div
            ref={ref}
            className={cn(
                "flex flex-wrap w-full gap-1 border-2 p-2 border-border dark:border-darkBorder rounded-base bg-white dark:bg-darkBg",
                {
                    "focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2": activeIndex === -1,
                },
                className,
            )}
            {...props}
        >
            {value.map((item, index) => (
                <Badge
                    key={item}
                    className={cn(
                        "px-1 rounded-xl flex items-center gap-1 cursor-pointer ",
                        activeIndex === index && "ring-2 ring-muted-foreground",
                        badgeProps?.className
                    )}
                    variant={"secondary"}
                    onClick={() => onValueChange(item)}
                >
                    <span className="">{item}</span>
                    <button
                        aria-label={`Remove ${item} option`}
                        aria-roledescription="button to remove option"
                        type="button"
                        onMouseDown={mousePreventDefault}
                        onClick={() => onValueChange(item)}
                    >
                        <span className="sr-only">Remove {item} option</span>
                        <RemoveIcon className="h-4 w-4 hover:stroke-destructive" />
                    </button>
                </Badge>
            ))}
            {children}
        </div>
    );
});

MultiSelectorTrigger.displayName = "MultiSelectorTrigger";

const MultiSelectorInput = forwardRef<
    React.ElementRef<typeof CommandPrimitive.Input>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => {
    const {
        setOpen,
        inputValue,
        setInputValue,
        activeIndex,
        setActiveIndex,
        handleSelect,
        ref: inputRef,
    } = useMultiSelect();

    return (
        <div className="flex flex-1 items-stretch">
            <CommandPrimitive.Input
                {...props}
                tabIndex={0}
                ref={inputRef}
                value={inputValue}
                onValueChange={activeIndex === -1 ? setInputValue : undefined}
                onSelect={handleSelect}
                onBlur={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onClick={() => setActiveIndex(-1)}
                className={cn(
                    "ml-2 bg-transparent outline-none placeholder:text-muted-foreground placeholder:text-base flex-1 h-full min-h-[2.5rem] py-2 text-base",
                    className,
                    activeIndex !== -1 && "caret-transparent",
                )}
            />
        </div>
    );
});

MultiSelectorInput.displayName = "MultiSelectorInput";

const MultiSelectorContent = forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ children }, ref) => {
    const { open } = useMultiSelect();
    return (
        <div ref={ref} className="relative">
            {open && children}
        </div>
    );
});

MultiSelectorContent.displayName = "MultiSelectorContent";

const MultiSelectorList = forwardRef<
    React.ElementRef<typeof CommandPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, children }, ref) => {
    return (
        <CommandList
            ref={ref}
            className={cn(
                "p-2 flex flex-col gap-2 rounded-base border-2 border-border dark:border-darkBorder transition-colors w-full absolute bg-white dark:bg-darkBg shadow-light dark:shadow-dark z-10 top-0",
                "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border dark:scrollbar-thumb-darkBorder scrollbar-thumb-rounded-lg",
                className,
            )}
        >
            {children}
            <CommandEmpty>
                <span className="text-text dark:text-darkText">Press enter or click add to apply.</span>
            </CommandEmpty>
        </CommandList>
    );
});

MultiSelectorList.displayName = "MultiSelectorList";

const MultiSelectorItem = forwardRef<
    React.ElementRef<typeof CommandPrimitive.Item>,
    { value: string } & React.ComponentPropsWithoutRef<
        typeof CommandPrimitive.Item
    >
>(({ className, value, children, ...props }, ref) => {
    const { value: Options, onValueChange, setInputValue } = useMultiSelect();

    const mousePreventDefault = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const isIncluded = Options.includes(value);
    return (
        <CommandItem
            ref={ref}
            {...props}
            onSelect={() => {
                onValueChange(value);
                setInputValue("");
            }}
            className={cn(
                "rounded-base cursor-pointer px-2 py-1 transition-colors flex justify-between text-text dark:text-darkText hover:bg-border/20 dark:hover:bg-darkBorder/20",
                className,
                isIncluded && "opacity-50 cursor-default",
                props.disabled && "opacity-50 cursor-not-allowed",
            )}
            onMouseDown={mousePreventDefault}
        >
            {children}
            {isIncluded && <Check className="h-4 w-4" />}
        </CommandItem>
    );
});

MultiSelectorItem.displayName = "MultiSelectorItem";

export {
    MultiSelector,
    MultiSelectorTrigger,
    MultiSelectorInput,
    MultiSelectorContent,
    MultiSelectorList,
    MultiSelectorItem,
};
