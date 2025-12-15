"use client";

import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";

interface PropertyActionsProps {
  property: {
    id: number;
    name: string;
  };
}

export function PropertyActions({ property }: PropertyActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteProperty = api.property.delete.useMutation();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProperty.mutateAsync({ id: property.id });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete property:", error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/properties/${property.id}/edit`}>
            <PencilIcon className="size-4" />
            Edit
          </Link>
        </Button>
        <Button
          onClick={() => setShowDeleteDialog(true)}
          size="sm"
          variant="outline"
        >
          <Trash2Icon className="size-4 text-destructive" />
          Delete
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{property.name}&quot;? This
              action cannot be undone and will remove all buildings and units
              associated with this property.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isDeleting}
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              onClick={handleDelete}
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Property"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
