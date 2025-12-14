import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ClipLoader from "react-spinners/ClipLoader";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  rightAction?: {
    label: string | React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  rightAction,
}: ModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
          <DialogTitle className="text-center w-full">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">{children}</div>
        {rightAction && (
          <DialogFooter>
            <Button
              onClick={rightAction.onClick}
              disabled={rightAction.disabled || rightAction.loading}
              className={`w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-6 text-md rounded-xl shadow-md transition-all ${
                rightAction.disabled ? "opacity-50" : "hover:-translate-y-0.5"
              }`}
              size={"sm"}
            >
              {rightAction.loading ? (
                <ClipLoader size={18} color="white" />
              ) : (
                rightAction.label
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
