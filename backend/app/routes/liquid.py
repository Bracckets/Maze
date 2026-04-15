from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.liquid.schemas import (
    LiquidBundleDetailOut,
    LiquidBundleResolveOut,
    LiquidBundleUpsertIn,
    LiquidBundleSummaryOut,
    LiquidExperimentOut,
    LiquidExperimentUpsertIn,
    LiquidKeyCreateIn,
    LiquidKeyDetailOut,
    LiquidKeyDraftUpdateIn,
    LiquidKeySummaryOut,
    LiquidOverviewOut,
    LiquidProfileOut,
    LiquidProfileUpsertIn,
    LiquidResolutionRequestIn,
    LiquidRuleOut,
    LiquidRuleUpsertIn,
    LiquidSegmentOut,
    LiquidSegmentUpsertIn,
    LiquidTraitOut,
    LiquidTraitUpsertIn,
    LiquidVariantCreateIn,
    LiquidVariantUpdateIn,
)
from app.liquid.service import (
    RUNTIME_TTL_SECONDS,
    create_liquid_bundle,
    create_liquid_experiment,
    create_liquid_key,
    create_liquid_profile,
    create_liquid_rule,
    create_liquid_segment,
    create_liquid_trait,
    create_liquid_variant,
    delete_liquid_key,
    delete_liquid_profile,
    delete_liquid_trait,
    delete_liquid_variant,
    demote_liquid_key,
    get_liquid_bundle_detail,
    get_liquid_experiment,
    get_liquid_key_detail,
    get_liquid_overview,
    get_liquid_profile,
    get_liquid_rule,
    get_liquid_segment,
    get_liquid_trait,
    list_liquid_bundles,
    list_liquid_experiments,
    list_liquid_keys,
    list_liquid_profiles,
    list_liquid_rules,
    list_liquid_segments,
    list_liquid_traits,
    publish_liquid_bundle,
    publish_liquid_key,
    resolve_liquid_bundle,
    update_liquid_bundle,
    update_liquid_experiment,
    update_liquid_key_draft,
    update_liquid_profile,
    update_liquid_rule,
    update_liquid_segment,
    update_liquid_trait,
    update_liquid_variant,
)
from app.routes.dependencies import get_api_key_context, get_current_account

router = APIRouter(prefix="/liquid", tags=["liquid"])


@router.get("/overview", response_model=LiquidOverviewOut)
def liquid_overview(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return get_liquid_overview(db, account["workspace_id"])


@router.get("/keys", response_model=list[LiquidKeySummaryOut])
def liquid_keys(
    q: str | None = Query(default=None, description="Optional search query"),
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    return list_liquid_keys(db, account["workspace_id"], query=q)


@router.post("/keys", response_model=LiquidKeyDetailOut, status_code=status.HTTP_201_CREATED)
def liquid_create_key(payload: LiquidKeyCreateIn, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return create_liquid_key(db, account["workspace_id"], account.get("user_id"), payload.model_dump())
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That Liquid key already exists.") from exc


@router.get("/keys/{key_id}", response_model=LiquidKeyDetailOut)
def liquid_key_detail(key_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return get_liquid_key_detail(db, account["workspace_id"], key_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/keys/{key_id}/draft", response_model=LiquidKeyDetailOut)
def liquid_update_key_draft(
    key_id: str,
    payload: LiquidKeyDraftUpdateIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return update_liquid_key_draft(db, account["workspace_id"], account.get("user_id"), key_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/keys/{key_id}/publish", response_model=LiquidKeyDetailOut)
def liquid_publish_key(key_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return publish_liquid_key(db, account["workspace_id"], account.get("user_id"), key_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/keys/{key_id}/demote", response_model=LiquidKeyDetailOut)
def liquid_demote_key(key_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return demote_liquid_key(db, account["workspace_id"], account.get("user_id"), key_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def liquid_delete_key(key_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        delete_liquid_key(db, account["workspace_id"], key_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/keys/{key_id}/variants", response_model=LiquidKeyDetailOut, status_code=status.HTTP_201_CREATED)
def liquid_create_variant(
    key_id: str,
    payload: LiquidVariantCreateIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return create_liquid_variant(db, account["workspace_id"], account.get("user_id"), key_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The draft variant conflicts with an existing default locale variant.") from exc


@router.put("/variants/{variant_id}", response_model=LiquidKeyDetailOut)
def liquid_update_variant(
    variant_id: str,
    payload: LiquidVariantUpdateIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return update_liquid_variant(db, account["workspace_id"], account.get("user_id"), variant_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The draft variant conflicts with an existing default locale variant.") from exc


@router.delete("/variants/{variant_id}", response_model=LiquidKeyDetailOut)
def liquid_delete_variant(variant_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return delete_liquid_variant(db, account["workspace_id"], variant_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/segments", response_model=list[LiquidSegmentOut])
def liquid_segments(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return list_liquid_segments(db, account["workspace_id"])


@router.post("/segments", response_model=LiquidSegmentOut, status_code=status.HTTP_201_CREATED)
def liquid_create_segment(payload: LiquidSegmentUpsertIn, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return create_liquid_segment(db, account["workspace_id"], account.get("user_id"), payload.model_dump())
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That segment key already exists.") from exc


@router.put("/segments/{segment_id}", response_model=LiquidSegmentOut)
def liquid_update_segment(
    segment_id: str,
    payload: LiquidSegmentUpsertIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return update_liquid_segment(db, account["workspace_id"], account.get("user_id"), segment_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That segment key already exists.") from exc


@router.get("/traits", response_model=list[LiquidTraitOut])
def liquid_traits(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return list_liquid_traits(db, account["workspace_id"])


@router.post("/traits", response_model=LiquidTraitOut, status_code=status.HTTP_201_CREATED)
def liquid_create_trait(payload: LiquidTraitUpsertIn, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return create_liquid_trait(db, account["workspace_id"], account.get("user_id"), payload.model_dump())
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That trait key already exists.") from exc


@router.put("/traits/{trait_id}", response_model=LiquidTraitOut)
def liquid_update_trait(
    trait_id: str,
    payload: LiquidTraitUpsertIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return update_liquid_trait(db, account["workspace_id"], account.get("user_id"), trait_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That trait key already exists.") from exc


@router.delete("/traits/{trait_id}", status_code=status.HTTP_204_NO_CONTENT)
def liquid_delete_trait_route(trait_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        delete_liquid_trait(db, account["workspace_id"], trait_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/profiles", response_model=list[LiquidProfileOut])
def liquid_profiles(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return list_liquid_profiles(db, account["workspace_id"])


@router.post("/profiles", response_model=LiquidProfileOut, status_code=status.HTTP_201_CREATED)
def liquid_create_profile(payload: LiquidProfileUpsertIn, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return create_liquid_profile(db, account["workspace_id"], account.get("user_id"), payload.model_dump())
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That profile key already exists.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.put("/profiles/{profile_id}", response_model=LiquidProfileOut)
def liquid_update_profile(
    profile_id: str,
    payload: LiquidProfileUpsertIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return update_liquid_profile(db, account["workspace_id"], account.get("user_id"), profile_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That profile key already exists.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def liquid_delete_profile_route(profile_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        delete_liquid_profile(db, account["workspace_id"], profile_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/rules", response_model=list[LiquidRuleOut])
def liquid_rules(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return list_liquid_rules(db, account["workspace_id"])


@router.post("/rules", response_model=LiquidRuleOut, status_code=status.HTTP_201_CREATED)
def liquid_create_rule(payload: LiquidRuleUpsertIn, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return create_liquid_rule(db, account["workspace_id"], account.get("user_id"), payload.model_dump())
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That rule key already exists.") from exc


@router.put("/rules/{rule_id}", response_model=LiquidRuleOut)
def liquid_update_rule(
    rule_id: str,
    payload: LiquidRuleUpsertIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return update_liquid_rule(db, account["workspace_id"], account.get("user_id"), rule_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That rule key already exists.") from exc


@router.get("/experiments", response_model=list[LiquidExperimentOut])
def liquid_experiments(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return list_liquid_experiments(db, account["workspace_id"])


@router.post("/experiments", response_model=LiquidExperimentOut, status_code=status.HTTP_201_CREATED)
def liquid_create_experiment(
    payload: LiquidExperimentUpsertIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return create_liquid_experiment(db, account["workspace_id"], account.get("user_id"), payload.model_dump())
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That experiment key already exists.") from exc


@router.put("/experiments/{experiment_id}", response_model=LiquidExperimentOut)
def liquid_update_experiment(
    experiment_id: str,
    payload: LiquidExperimentUpsertIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return update_liquid_experiment(db, account["workspace_id"], account.get("user_id"), experiment_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That experiment key already exists.") from exc


@router.get("/bundles", response_model=list[LiquidBundleSummaryOut])
def liquid_bundles(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return list_liquid_bundles(db, account["workspace_id"])


@router.post("/bundles", response_model=LiquidBundleDetailOut, status_code=status.HTTP_201_CREATED)
def liquid_create_bundle(payload: LiquidBundleUpsertIn, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return create_liquid_bundle(db, account["workspace_id"], account.get("user_id"), payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That screen key already exists.") from exc


@router.get("/bundles/{bundle_id}", response_model=LiquidBundleDetailOut)
def liquid_bundle_detail(bundle_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return get_liquid_bundle_detail(db, account["workspace_id"], bundle_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/bundles/{bundle_id}", response_model=LiquidBundleDetailOut)
def liquid_update_bundle(
    bundle_id: str,
    payload: LiquidBundleUpsertIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return update_liquid_bundle(db, account["workspace_id"], account.get("user_id"), bundle_id, payload.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That screen key already exists.") from exc


@router.post("/bundles/{bundle_id}/publish", response_model=LiquidBundleDetailOut)
def liquid_publish_bundle(bundle_id: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        return publish_liquid_bundle(db, account["workspace_id"], account.get("user_id"), bundle_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/preview/bundles/resolve", response_model=LiquidBundleResolveOut)
def liquid_preview_bundle(
    payload: LiquidResolutionRequestIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    try:
        return resolve_liquid_bundle(db, account["workspace_id"], payload.screenKey, payload.model_dump(), stage="draft")
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/runtime/bundles/resolve", response_model=LiquidBundleResolveOut)
def liquid_runtime_bundle(
    payload: LiquidResolutionRequestIn,
    response: Response,
    api_key_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db),
):
    try:
        resolved = resolve_liquid_bundle(
            db,
            api_key_context["workspace_id"],
            payload.screenKey,
            payload.model_dump(),
            stage="published",
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    response.headers["Cache-Control"] = f"private, max-age={RUNTIME_TTL_SECONDS}, stale-while-revalidate=300"
    response.headers["ETag"] = resolved["etag"]
    return resolved
